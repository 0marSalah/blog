import { useState } from 'react'
import { Auth } from './pages/Auth'
import { Home } from './pages/Home'
import { WasServer } from './wasRequest'
import type { AuthorSession } from './lib/authIdentity'
import type { BlogPost } from './types'

/**
 * Switches between the auth screen and the protected home screen based on
 * whether a session exists -- no router needed for just the two. Owns the
 * posts list too, loaded from the event that produces or changes it
 * (authenticating, publishing) rather than a passive effect on `Home`.
 */
export function WasConnection() {
  const [session, setSession] = useState<AuthorSession | null>(null)
  const [posts, setPosts] = useState<BlogPost[]>([])

  async function loadPosts(currentSession: AuthorSession) {
    const wasServer = new WasServer({
      client: currentSession.client,
      spaceId: currentSession.spaceId,
    })
    const items = await wasServer.list('posts')
    setPosts(items as unknown as BlogPost[])
  }

  async function handleAuthenticated(nextSession: AuthorSession) {
    setSession(nextSession)
    await loadPosts(nextSession)
  }

  function handleSignOut() {
    setSession(null)
    setPosts([])
  }

  if (!session) {
    return <Auth onAuthenticated={handleAuthenticated} />
  }

  return (
    <Home
      session={session}
      posts={posts}
      onPublished={() => loadPosts(session)}
      onSignOut={handleSignOut}
    />
  )
}
