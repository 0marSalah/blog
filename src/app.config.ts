/**
 * App-wide constants, in one place -- matching Freewallet's own
 * `app.config.ts` convention.
 */

/**
 * Standardized across every piece of this experiment -- server and client
 * must agree on this exact string, since ZCap `invocationTarget`s embed it
 * (see the was-teaching-server README's warning about `localhost` vs
 * `127.0.0.1`).
 */
export const WAS_SERVER_URL = 'http://localhost:3002'

/**
 * The blog's one author identity. Generated once, hardcoded here -- a
 * single-author blog doesn't need a signup/signin flow, just a fixed DID to
 * label posts as authored by.
 *
 * This is the PUBLIC half only, safe to ship in the browser bundle (a `did:
 * key` string is nothing but the public key spelled out). The matching
 * secret key must never live here or anywhere under `src/` -- this file
 * ships to every visitor. It's kept in the repo-root `.env.local` (gitignored),
 * for a future local-only publish script to sign write requests with -- that
 * script runs on this machine only and is never bundled by Vite.
 */
export const AUTHOR_DID = 'did:key:z6MkuL26V1uzuRcxmuw8acKLVK8pWyVf6armP4xAuP925nA6'

/**
 * Phase 2's bootstrap resource -- the unlock identity's own Space, where the
 * author's encrypted secret key lives. See `lib/authIdentity.ts` and
 * ARCHITECTURE.md's Phase 2.
 */
export const BOOTSTRAP_COLLECTION = 'bootstrap'
export const BOOTSTRAP_RESOURCE = 'account'
export const RECORD_VERSION = 1
export const RECORD_LABEL = 'blog-author'
