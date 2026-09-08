/**
 * The constants that have to stay consistent across the app, kept apart from
 * `wasApp.ts` so that file is only the WAS wiring -- collections, stores, and
 * the sync registry.
 *
 * Neither of these is a WAS setting. One names a document this app happens to
 * publish; the other is an expectation the app checks itself against. Nothing
 * here is sent to a server.
 */

/**
 * The single blog this app publishes. A fixed id (rather than a uuid) so the
 * blog's public URL is stable and predictable -- one author, one blog, for
 * now.
 */
export const BLOG_ID = 'blog'

/**
 * The WAS server this app is meant to be talking to. Nothing here selects it
 * -- the wallet does, and its choice arrives inside the delegated grants -- so
 * this constant exists only to notice when the running session is pointed
 * somewhere else (a session persisted against a previous server, restored on
 * reload long after the wallet's own config changed).
 */
export const EXPECTED_SERVER_URL = 'https://freewallet.cloud'
