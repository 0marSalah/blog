# Architecture

This isn't really a blog project. It's a blog-shaped excuse to find out what
it actually takes for a plain browser app to talk to Wallet Attached Storage
-- identity, authorization, reads and writes -- with an eye toward building
an ActivityPub reader down the line. So this document cares less about "here
is the code" and more about "here is what we tried, what we threw away, and
why," because that reasoning is the actual value of the exercise and the
easiest thing to lose.

## Where things stand

Small and honest about it: one page, one identity per author (durable now,
via passphrase -- Phase 2, below), one Space, one Collection. No routing, no
editing, no deleting, nothing readable by a stranger yet. Everything
described below has actually been run against a live, locally-hosted
`was-teaching-server` -- none of it is theoretical. When something below
sounds too easy, that's because it was; when something sounds like it hurt,
it did, and that's the whole point of writing it down.

## How a post gets from a click to the server

Registering generates a real Ed25519 keypair -- no server round trip for
that part, the identity just *is* the key -- and, separately, a second
identity derived from a passphrase, whose only job is to let that same real
key be found and recovered again later, on any browser (the mechanics are
Phase 2, below; this section is just the shape of a normal session
afterward). That real keypair goes straight into a `WasClient`, which signs
its own request and gets back a Space this author owns. From there it's one
more step most people wouldn't expect: WAS refuses to invent a `posts`
collection for you, so the app creates one explicitly, right after
registering, before it ever tries to publish anything. Only then does the
publish form's `WasServer.put()` actually write something -- and it's a
real signed request through `@interop/was-client`, not a bare `fetch` with
a JSON body and a prayer.

```
did:key (the real author identity)
     │
     ▼
WasClient.fromSigner(...)
     │
     ▼
createSpace()  →  a Space this author owns, durably
     │
     ▼
createCollection({ id: 'posts' })   ← has to happen before anything can be written
     │
     ▼
WasServer.put(collectionId, resourceId, data)  →  one BlogPost, for real, on the server
```

Where things live:

- **`src/app.config.ts`** holds the constants that need to agree everywhere
  -- `WAS_SERVER_URL`, and `AUTHOR_DID`, which is currently a bit of a fossil
  (more on that below).
- **`src/lib/authIdentity.ts`** is `registerAuthor()` / `loginAuthor()` --
  the durable identity, detailed in Phase 2 below.
- **`src/was.ts`** is `WasServer`, a small wrapper around one Space so the
  rest of the app doesn't have to keep writing
  `client.space(id).collection(id).resource(id)` everywhere. Its `list()`
  exists because the client's own listing only gives you summaries, not
  content, so it quietly fetches every item's body afterward.
- **`src/WasConnection.tsx`** is the whole app right now: register/login,
  the publish form, the posts that come back.
- **`src/types.ts`** is the data model, and it doesn't know or care that any
  of the above exists.

## The data model was designed to not care how it's stored

`Blog`, `BlogPost`, and `AssetRef` in `types.ts` came before any of the WAS
plumbing, on purpose. Two things about them are worth remembering the reason
for, since the reason is easy to forget once the code just looks obvious:

`id` and `url` are two different fields, not one. A post's identity and a
post's current address are different facts, and conflating them is exactly
the mistake that breaks an RSS feed the moment you move hosts -- the whole
back catalogue looks brand new to every subscriber. And `blogId` sits
explicitly on every `BlogPost` rather than being something you infer from
which folder it's sitting in, because a post ought to be able to say "I
belong to this blog" even after somebody moves it somewhere else.

The bigger intention, though, is that this model was never supposed to know
about RSS or ActivityPub or HTML at all -- those are supposed to be things
you render *from* it, not shapes that leak backward into it:

```
             the canonical model
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        HTML       RSS    ActivityPub
```

Which is also why v1 pointedly does not have comments, tags, categories,
likes, multiple authors, or version history. Not because they're hard, but
because none of them were needed to answer the actual question this project
is asking.

## Mapping that model onto WAS -- what we settled, and what we didn't

The settled parts turned out pretty simple: one Blog per Space, a fixed pair
of collections (`posts`, `assets`) rather than anything dynamic, UUIDs for
post ids instead of content hashes (a hash would shift every time you edited
a post, which defeats the whole point of `id` staying stable), and ordinary
WAS `PUT` semantics for writing.

Two things we deliberately left unanswered:

Nobody outside this browser session can find this blog right now. The
Space id only exists in memory, in the tab that made it. That's fine for an
experiment about writing, but a real blog needs some actual answer for how
an RSS reader or an ActivityPub follower finds it -- a predictable id, a
service entry on a DID document, something -- and we haven't picked one yet.

And nothing is set to `PublicCanRead` yet, so even reading currently needs
the same authorization writing does. A real public blog wants GETs to need
nothing at all, which is a flag you set when you create the collection, not
something you patch on later -- so it's worth deciding before there's real
content sitting behind the wrong policy.

## The identity story, or: five things we built and un-built

This is the part most worth keeping, because the code no longer shows any
of it happened, and the reasoning is the only thing that would tell a future
session not to just build it all again.

We started with the obvious thing: sign-up and sign-in pages, a DID
generated in the browser, its secret key encrypted to a passphrase with our
own hand-rolled PBKDF2 and AES-GCM, stashed in IndexedDB. It worked. Then we
noticed Freewallet already has a real version of exactly this, so we swapped
our homemade crypto for its actual `@interop/wallet-core/keyring` primitives
-- the same 600,000-iteration KDF, the same signed-record sealing -- just
kept local instead of pointed at a WAS "Unlock Space" we didn't have. That
change also meant sign-in stopped asking for a DID at all: the passphrase
alone finds and unlocks the right record, exactly like Freewallet itself.

From there we went further into how this ecosystem actually expects apps to
authenticate: a "Continue with wallet" button using real CHAPI (DID
Authentication plus a self-issued Login Credential, verified against the
live `authn.io` mediator), and then the fuller App Connect flow on top of
it -- one popup that both proves who you are and gets the wallet to delegate
storage access into a Space *it* owns, via a fresh app-specific key it
mints. That's genuinely how `wallet-core`, `was-react`, and Freewallet all
expect a connected app to behave.

And then we stopped and asked the obvious question: does a blog need any of
that? No. All four of those things solve "how does some stranger prove who
they are," and a single-author blog doesn't have strangers -- it has one
person, publishing occasionally. So all of it came out: the wallet vault,
the CHAPI flow, the sign-up and sign-in screens, and every dependency that
only existed to support them. What replaced it was about as small as
possible -- one hardcoded public DID in `app.config.ts`, its matching secret
sitting in a gitignored `.env.local` for some future script that publishes
from this machine and this machine only, never anywhere under `src/`, since
anything there ends up in front of every visitor's browser.

Then, actually wiring up the first real write, the same fork showed up
again in a smaller shape: should the blog own its Space directly with its
own key, or write into a Space the author's own wallet already owns? For
this milestone we picked the direct route -- generate a throwaway `did:key`
per browser session and let it create and own its own Space. App Connect
came back out a second time on that basis.

Which left one loose thread at the time: every session generated a brand
new identity and a disposable, throwaway Space of its own, with no way to
come back to the same one tomorrow. Phase 2, right below, is what actually
closed that. One thing it did *not* close: `AUTHOR_DID` and its secret in
`.env.local` still aren't what the app uses. That was always a different,
separately-hardcoded identity, never wired to anything live, and Phase 2's
passphrase-derived identity is a distinct mechanism again -- so `AUTHOR_DID`
remains exactly as unused as before. If you're reading this later wondering
why nothing seems to use it -- that's why, still not a bug, just a fossil
from an earlier decision that a later one didn't happen to clean up.

## Phase 2: an actual register/login, sized for one author

Built and verified against the live server -- see the end of this section
for exactly what was tested and how. What follows was the plan going in;
it held up, with one detail settled by actually trying it rather than
assuming (2.2, below).

The dev-identity flow generates a real key but has no notion of "come back
later." A real register/login needs the *same* signing key reconstructible
from something a person can carry across browsers and devices: a
passphrase. Freewallet's real answer to that turned out to be more careful
than a first read suggests, and it's worth being precise about before
copying anything from it.

Freewallet never stores your actual signing key anywhere recoverable. Its
"Unlock Space" record -- the thing a passphrase-derived identity can read
back -- deliberately carries no key material at all, by its own docstring:
just the account's controller DID and where its Space lives. A returning
session on the *same* device decrypts its own local copy of the real key
(never left that machine); a genuinely *new* device doesn't recover the
original key at all -- it mints itself a fresh one, vouched for by the
passphrase-derived identity's own standing, narrowly-scoped delegation
rights on the account's DID document (the "ladder delegation" machinery
referenced throughout `was-teaching-server`'s own history). No single master
key ever travels between machines. That machinery exists to coordinate
several devices sharing one encrypted account, which is a real problem we
don't have.

So Phase 2 borrows the *shape* of Freewallet's pattern -- a passphrase
deriving a second, real identity that owns and can self-authorize reading
one small resource -- without copying the part that avoids storing key
material, because that part exists to solve a multi-device problem this
blog doesn't have yet. With exactly one author and no roster to coordinate,
there's nothing unsafe about that resource actually holding the real secret,
encrypted to the unlock identity's own key. Concretely:

**Register** (`registerAuthor` in `src/lib/authIdentity.ts`). Generate the
real author key pair, same as before. Ask for a passphrase and derive an
unlock identity from it -- `deriveUnlockIdentity` / `KEYRING_KDF` from
`@interop/wallet-core/keyring`, the same real KDF used and then removed
earlier in this project's history, this time the only auth-related thing
being added rather than one piece of a much bigger CHAPI/App Connect stack.

That unlock identity provisions and controls its *own* Space -- not a
resource tucked inside the author's content Space, which was the other
option on the table going in (2.2 asked not to assume the answer, so this
got tried both ways in practice before settling here). A whole separate
Space, addressed by `unlockSpaceIdFor` (a plain hash of the unlock DID,
already exported by `wallet-core/keyring`), keeps the two identities'
authority cleanly apart: the unlock identity is *only* ever the controller
of its own tiny bootstrap Space, never granted anything on the author's
real one. One resource in it holds the author's real secret key (plus
where the author's content Space lives), encrypted to the unlock identity's
own key-agreement key and sealed with the same signed-record codec
(`mintRecordEncryption` / `recordSealCipher` / `signRecordFrame`) Freewallet
uses for its own keyring record.

**Login, any browser, any device** (`loginAuthor`). Passphrase in, the same
unlock identity comes back out (the derivation is deterministic), it reads
its own resource -- self-authorized, no chicken-and-egg bootstrapping
problem, since the authority to read the box *is* the passphrase-derived
key, not the account's real one -- decrypts it locally, and hands back the
real author key. From there it's the existing flow: reconstruct the real
signer, operate against the actual Space as the actual author.
`loginAuthor` takes nothing but a passphrase and shares no state with
`registerAuthor` whatsoever, which is itself the proof that this really is
independent of ever holding the author key -- there's nothing else it could
be reading from.

Side effect worth noting: this also answers the author's own "which Space is
mine again" question, the same way Freewallet's does -- the unlock
identity's own Space address is derived from the passphrase alone, so a
returning author never needs to remember a spaceId, only the passphrase.
That's a different problem from a stranger discovering the blog to read it
(still open, still needs its own answer), but it fully closes the loop for
the one person who's actually supposed to be able to log back in.

### What this design gives up, on purpose (2.4)

Recorded plainly, because the whole point of choosing the smaller design was
to know exactly what it costs, not to pretend it costs nothing:

- **One key, one place.** There is exactly one copy of the author's real
  secret key, and it exists in exactly one encrypted form, in the unlock
  Space. Freewallet's multi-device model never has a single point like this
  -- every device holds its own key, none of them are that key. Here,
  anyone who can derive the right unlock identity (i.e. knows the
  passphrase) gets the *actual* author key back, not a scoped, revocable
  stand-in. There is no way to grant a second device or collaborator access
  without handing them the same passphrase -- there's no concept of a
  second, narrower identity at all.
- **Nothing is revocable.** Freewallet can retire one compromised device's
  key without touching any other device's access, because every device's
  key is genuinely separate. Here, there's only the one key -- suspecting
  it's compromised means generating a brand new author identity (a new
  `did:key`, a new content Space) and abandoning the old one; there's no
  "kick this device out" move, because there's no per-device anything to
  kick.
- **The passphrase is the entire perimeter, and it's brute-forceable in
  principle.** Both the unlock Space's address and its unlocking key fall
  straight out of the passphrase, so guessing it correctly gets an attacker
  everything -- the same "brain wallet" exposure discussed earlier in this
  project's history. The KDF's 600,000 iterations raise the cost of trying
  many guesses; they don't rescue a weak passphrase. Freewallet's real
  system hedges this with alternative unlock methods (a passkey, whose
  secret is never a memorized string an attacker could guess at all) --
  this design has no such hedge, because it was never built.
- **What it does honestly deliver:** the one thing it set out to, cross-
  device recovery of a single identity from a memorized secret, with no
  local storage anywhere in the recovery path -- verified live, not assumed
  (below).

### How this was actually verified

Not asserted from the design alone -- run against the real server, several
ways:

- `registerAuthor` then `loginAuthor` with the same passphrase, in a fresh
  call sharing no state: recovers the identical author DID and the
  identical content Space id.
- The literal Browser A / Browser B test 2.3 asked for: register in one
  Playwright browser instance, close it completely, open a second,
  independent instance with an empty profile, log in with only the
  passphrase -- recovers the same identity, same Space, and can publish a
  new post into it that sits alongside the one Browser A wrote.
- A wrong passphrase on login returns "no account," not an error and not
  someone else's account.
- Registering the same passphrase twice is refused outright, rather than
  silently overwriting the first account's stored key.

## What WAS itself turned out to feel like

This is the actual research output, recorded as it happened rather than
paraphrased from the spec:

A 404 doesn't tell you anything. Asking for a Space you're not authorized to
see looks exactly like asking for one that was never created -- we checked
this directly, with a bare `curl` against a Space the app itself had just
made, and got the same shape of failure either way. Only asking through the
authorized client actually worked.

Writing anything requires a real signed capability. We know because a naive
`fetch` PUT with no signing just gets refused, which is the entire reason
`WasServer.put()` bothers going through `@interop/was-client` instead of
being three lines of `fetch`.

Nothing gets created for you. A Space doesn't come with a `posts` collection
inside it -- you ask for one, explicitly, before the first write, or the
write throws.

Listing a collection doesn't give you its content, just enough to know what
to ask for next -- ids, urls, content types. Actually rendering a page of
posts means a second round of fetches, one per item.

And the one server URL has to be exactly, byte-for-byte the same everywhere,
because it's baked into every signed capability's target -- `localhost` and
`127.0.0.1` are not the same string as far as that's concerned, even though
they're the same server.

The one pleasant surprise: creating a Space in the first place needed none
of the ceremony we expected. `WasClient.fromSigner(...).createSpace()` just
signs its own proof and hands you back a Space. That's the one spot this
experiment found things easier than we'd braced for.

## Look

MUI, dark mode only, no toggle, because nobody asked for a light one.

## What's still missing

Nothing has a URL a second person could visit yet. There's no reading path
in the UI beyond "look at what I just wrote." Update and delete don't exist,
even though `WasServer` is named generally enough to suggest they should.
Nothing is publicly readable. Identity itself is durable now -- Phase 2
closed that -- but everything downstream of it still isn't: no revocation,
no second device with its own scoped access, no recovery method beyond the
one passphrase, exactly the trade-offs that section wrote down on purpose.
