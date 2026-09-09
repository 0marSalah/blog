import { createEntityStore, type StoreRegistry, type WasAppConfig } from '@interop/was-react'
import type { Blog, BlogPost, Follow } from './types'

/**
 * The "proper" WAS integration: `@interop/was-react` owns login (CHAPI +
 * App Connect), local-first storage, and background sync -- this app just
 * declares its collections and reads/writes through the entity store, it
 * never touches a `WasClient` or a server URL directly. See
 * ARCHITECTURE.md for why earlier attempts hand-rolled this instead, and
 * why we came back to do it this way.
 */

export const useBlogs = createEntityStore<Blog>('blogs')
export const usePosts = createEntityStore<BlogPost>('posts')
export const useFollows = createEntityStore<Follow>('follows')

export const wasAppConfig: WasAppConfig = {
  appName: 'Blog',
  appOrigin: window.location.origin,
  // The app's canonical URL, which the wallet matches an existing app key
  // against or mints a fresh one for. It has to include the deployment's base
  // path: on a GitHub Pages project site the app lives at `/<repo>/`, and
  // naming the bare origin instead would hand every project on that domain the
  // same app identity. `BASE_URL` is `/` in dev, so this is unchanged there.
  appUrl: new URL(import.meta.env.BASE_URL, window.location.origin).href,
  collections: [
    // Public: the blog's own identity document -- name, and a pointer at the
    // posts. This is the actor half of ActivityPub's actor/outbox split, and
    // the one URL a follower keeps.
    { key: 'blogs', id: 'blogs', visibility: 'public' },
    // Public: reads need no capability at all, matching what a blog wants
    // -- only writes go through the author's own delegated capability.
    { key: 'posts', id: 'posts', visibility: 'public', indexes: ['blogId'] },
    // Private (the default, so encrypted at rest and on the server): who you
    // read is nobody else's business. It syncs across your own devices and
    // nothing more -- the followed authors never learn about it.
    { key: 'follows', id: 'follows' },
  ],
  onboarding: 'login-gated',
}

export const registry: StoreRegistry = {
  blogs: {
    hydrate: () => useBlogs.getState().hydrate(),
    upsert: (doc) => useBlogs.getState().patch(doc as Blog),
    drop: (uuid) => useBlogs.getState().drop(uuid),
    clear: () => useBlogs.getState().replaceAll([]),
  },
  posts: {
    hydrate: () => usePosts.getState().hydrate(),
    upsert: (doc) => usePosts.getState().patch(doc as BlogPost),
    drop: (uuid) => usePosts.getState().drop(uuid),
    clear: () => usePosts.getState().replaceAll([]),
  },
  follows: {
    hydrate: () => useFollows.getState().hydrate(),
    upsert: (doc) => useFollows.getState().patch(doc as Follow),
    drop: (uuid) => useFollows.getState().drop(uuid),
    clear: () => useFollows.getState().replaceAll([]),
  },
}
