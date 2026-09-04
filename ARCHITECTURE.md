# Architecture

This isn't really a blog project. It's an excuse to learn what it actually
takes for a plain browser app to talk to Wallet Attached Storage: identity,
auth, reading, writing. The eventual goal is an ActivityPub reader. So this
doc cares more about "what we tried and why" than "here's the code" -- the
reasoning is the part that's easy to lose later.

## Where things stand

One page (well, two screens now -- auth and home), a real durable identity
(passphrase-based, works on any browser), one Space, one Collection, and
posts are publicly readable. No routing library, no editing, no deleting.
Everything below was actually run against a live `was-teaching-server` --
nothing here is guessed.

## File map

- `src/app.config.ts` -- every constant that needs to stay consistent
  across the app: `WAS_SERVER_URL`, `AUTHOR_DID` (unused, see below), and
  the bootstrap-record constants.
- `src/lib/authIdentity.ts` -- `registerAuthor()` / `loginAuthor()`. The
  whole passphrase-based identity system. See Phase 2 below.
- `src/wasRequest.ts` -- `WasServer`. A small wrapper so the rest of the app
  doesn't repeat `client.space(id).collection(id).resource(id)`
  everywhere. Has `put()` and `list()`.
- `src/pages/Auth.tsx` -- the auth screen. One passphrase field, a
  Register/Login switch.
- `src/pages/Home.tsx` -- protected. The publish form and the post list.
  Only ever rendered when a session exists.
- `src/WasConnection.tsx` -- switches between `Auth` and `Home` based on
  whether we have a session. No router needed for just two screens.
- `src/types.ts` -- the data model (`Blog`, `BlogPost`, `AssetRef`). Doesn't
  know or care about anything above.
- `src/styles/theme.ts` -- MUI, dark mode, that's it.

## How a post actually gets saved

Register a passphrase, get a real author identity and a Space for it. Log
in later with the same passphrase, get the same identity and Space back.
Once logged in:

```
did:key (the real author identity)
     |
     v
WasClient.fromSigner(...)
     |
     v
createSpace()  ->  a Space this author owns, for good
     |
     v
createCollection({ id: 'posts' })   <- has to happen first, WAS won't do it for you
     |
     v
posts.setPublic()   <- anyone can read; only the author can write
     |
     v
WasServer.put(collectionId, resourceId, data)  ->  a real post, saved for real
```

## The data model doesn't care how it's stored

`types.ts` came before any of the WAS code, on purpose. Two small decisions
worth remembering the reason for:

`id` and `url` are separate fields. A post's identity and its current
address are two different things. Mixing them up is the classic RSS bug:
move hosts and your whole feed looks brand new to every subscriber.

The model doesn't know about RSS or ActivityPub or HTML. Those are things
you render *from* it, not shapes baked into it:

```
       the canonical model
              |
     +--------+--------+
     v        v        v
   HTML      RSS   ActivityPub
```

v1 also skips comments, tags, categories, likes, multiple authors, version
history. Not because they're hard -- just not needed yet.

## Mapping it onto WAS

Settled: one Blog per Space. Two fixed collections (`posts`, `assets`), not
dynamic ones. UUIDs for post ids, not content hashes (a hash would change
every time you edit a post, and `id` is supposed to stay stable). Normal WAS
`PUT` for writing.

Posts are now set `PublicCanRead` right after the collection is created.
Confirmed with a raw `curl`, no auth headers at all:

- `GET /space/:id/posts/` -> 200, full listing.
- `GET /space/:id/posts/:id` -> 200, the actual post.
- `POST /space/:id/posts/` with no signing -> 401, refused.

So reads are open, writes still need the author's key. That's the shape a
blog actually wants.

Still open: nobody outside the browser that registered can find this blog.
The Space id only exists once you've logged in. An RSS reader or an
ActivityPub follower needs some real way to discover it -- not decided yet.

## The identity story -- five things we built, then un-built

Worth keeping because the code doesn't show any of this happened anymore.

We started with sign-up/sign-in pages, a DID generated in the browser, its
key encrypted to a passphrase with our own PBKDF2 + AES-GCM, saved in
IndexedDB. It worked. Then we noticed Freewallet already has a real version
of this, so we swapped in its actual `@interop/wallet-core/keyring`
primitives -- same 600,000-iteration KDF, same signed-record sealing -- just
kept local since we had no WAS "Unlock Space" yet. That also meant login
stopped asking for a DID: the passphrase alone finds and unlocks the right
record, same as Freewallet.

Then we added real CHAPI login ("Continue with wallet"): DID Authentication
plus a self-issued Login Credential, checked against the live `authn.io`
mediator. Then App Connect on top of that -- one popup that both proves who
you are and gets a wallet to hand over storage access, via a fresh
app-specific key the wallet mints. That's genuinely how this ecosystem
expects a connected app to work.

Then we asked: does a blog actually need any of that? No. All four things
solve "how does a stranger prove who they are," and a single-author blog
doesn't have strangers, just one person publishing sometimes. So all of it
came out -- the wallet vault, CHAPI, the auth pages, every dependency that
only existed for them. Replaced with one hardcoded public `AUTHOR_DID` in
`app.config.ts`, its secret sitting in a gitignored `.env.local` for some
future local-only publish script. Never under `src/` -- anything there ships
to every visitor.

Then, actually wiring up a real write, the same question came back smaller:
should the blog own its Space directly, or write into a Space the author's
own wallet already owns? We picked direct for that milestone: generate a
throwaway `did:key` per browser session, let it own its own Space. Which
left the thread that Phase 2 (next) actually closes.

One loose end left alone on purpose: `AUTHOR_DID` and its secret in
`.env.local` still aren't what the app uses. That was always a separate,
never-wired identity. Phase 2's passphrase-derived identity is a different
mechanism again. If you're wondering why nothing touches `AUTHOR_DID` --
that's why, not a bug.

## Phase 2: a real register/login, sized for one author

Built and tested against the live server.

The old flow generated a real key but forgot it existed the moment you
refreshed. A real register/login needs the *same* key coming back later,
recoverable from something a person can actually carry around -- a
passphrase.

Freewallet's real answer here is more careful than it first looks, so it's
worth being precise. Freewallet **never stores your actual signing key**
anywhere recoverable. Its "Unlock Space" record only holds a pointer --
which DID controls the account, where its Space is -- and deliberately no
key material, straight from its own docstring. Same device later: you
decrypt your own local copy, it never left. A genuinely new device: it
doesn't recover the old key at all, it mints itself a brand new one, vouched
for by the passphrase identity's own narrow delegation rights on the DID
document (the "ladder delegation" stuff mentioned in `was-teaching-server`'s
history). No master key ever travels between machines. That whole system
exists to coordinate several devices sharing one account -- a problem we
don't have.

So Phase 2 borrows the *shape* -- a passphrase deriving a second identity
that owns and can open one small resource on its own -- without the part
that avoids storing the key, because that part solves a problem we don't
have. One author, no devices to coordinate: nothing wrong with that resource
actually holding the real secret, encrypted.

**Register** (`registerAuthor`). Make the real author key pair. Derive an
unlock identity from the passphrase (`deriveUnlockIdentity` / `KEYRING_KDF`,
the same real KDF from before, now the only auth thing in the app instead of
one piece of a much bigger stack). That unlock identity gets its *own*
Space -- not a resource tucked inside the author's Space, which was the
other option on the table; we actually tried both before picking this one.
A separate Space, addressed by `unlockSpaceIdFor` (a plain hash of the
unlock DID, so it's always the same address for the same passphrase, nothing
to remember). One resource in it: the author's secret key + where their
content Space lives, encrypted to the unlock identity's key.

**Login** (`loginAuthor`). Same passphrase in, same unlock identity out
(it's deterministic), reads its own resource -- no chicken-and-egg problem,
since the thing that can open the box *is* the passphrase-derived key, not
the author's key. Decrypts it, hands back the real author key. `loginAuthor`
only ever takes a passphrase and shares nothing with `registerAuthor` --
that's the actual proof it works independently of ever holding the author
key.

Side benefit: this also answers "which Space is mine again" for the author.
The unlock identity's Space address comes straight out of the passphrase, so
you never need to remember a spaceId. Different problem from a stranger
discovering the blog to read it (still open, above) -- but fully solved for
the one person who's supposed to log back in.

### What this gives up, on purpose

- **One key, one place.** Freewallet's model never has a single point like
  this -- every device holds its own key. Here there's exactly one real key.
  Anyone who guesses the passphrase gets the actual key back, not some
  scoped stand-in. No way to give a second device its own narrower access.
- **Nothing is revocable.** Freewallet can retire one compromised device
  without touching the others. Here there's only the one key -- if it's
  compromised, the fix is a whole new identity, not "kick this device out."
- **The passphrase is the entire wall, and it's guessable in principle.**
  Both the Space address and the unlock key fall straight out of the
  passphrase, so a correct guess gets everything -- the same "brain wallet"
  problem discussed earlier. The 600,000-iteration KDF makes guessing many
  passphrases expensive; it doesn't save a weak one. Freewallet hedges this
  with passkeys, which aren't guessable at all. We don't have that hedge.
- **What it does deliver, for real:** cross-device recovery of one identity
  from a memorized secret, with zero local storage anywhere in the recovery
  path. Actually tested, not just assumed (below).

### How it was actually tested

- Register then login with the same passphrase, fresh call, no shared
  state: same author DID, same Space, every time.
- The literal two-browser test: register in one fully separate Playwright
  browser, close it completely, open a second one with an empty profile,
  log in with only the passphrase -- same identity, same Space, and it can
  publish a post that sits right next to the one the first browser wrote.
- Wrong passphrase on login: "no account," not an error, not someone else's
  account.
- Registering the same passphrase twice: refused outright, doesn't silently
  overwrite the first account.

## What WAS itself felt like to use

The actual research output, written down as it happened:

A 404 tells you nothing. Asking for a Space you can't see looks exactly like
asking for one that was never made -- checked directly with a bare `curl`
against a Space the app had just created. Only the authorized client
actually worked.

Writing needs a real signed capability. A plain `fetch` PUT with no signing
just gets refused -- exactly why `WasServer.put()` goes through
`@interop/was-client` instead of three lines of `fetch`.

Nothing gets created for you. A Space doesn't come with a `posts` collection
already in it. You ask for one, explicitly, before the first write, or the
write throws.

Listing a collection doesn't hand you the content, just enough to know what
to ask for next. Rendering an actual page of posts means a second round of
fetches, one per item.

The server URL has to match, byte for byte, everywhere -- it's baked into
every signed capability's target. `localhost` and `127.0.0.1` are not the
same string as far as that's concerned, even though they're the same
server.

One pleasant surprise: creating a Space needed none of the ceremony we
expected. `WasClient.fromSigner(...).createSpace()` just signs its own proof
and hands you back a Space. Same for making a collection public --
`collection.setPublic()`, one call, done. Those are the two spots this
project found easier than expected.

## Look

MUI, dark mode only, no toggle, nobody asked for a light one.

## What's still missing

Nothing has a URL a second person could actually visit as a page. No
reading UI beyond "look at what I just wrote." No update, no delete, even
though `WasServer` is named generally enough to suggest they should exist.
Identity is durable now (Phase 2), but nothing downstream of it is: no
revocation, no second device with its own scoped access, no recovery method
besides the one passphrase -- exactly the trade-offs written down above, on
purpose.
