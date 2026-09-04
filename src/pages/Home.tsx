import { useState } from 'react'
import type { AuthorSession } from '../lib/authIdentity'
import { WasServer } from '../wasRequest'
import type { BlogPost } from '../types'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

/**
 * Protected: only ever rendered once `WasConnection` holds a session. The
 * publish form and the posts that come back from the author's own Space --
 * `posts` and its refresh (`onPublished`) are owned by `WasConnection`, not
 * fetched here.
 */
export function Home({
  session,
  posts,
  onPublished,
  onSignOut,
}: {
  session: AuthorSession
  posts: BlogPost[]
  onPublished: () => void | Promise<void>
  onSignOut: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePublish(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const wasServer = new WasServer({ client: session.client, spaceId: session.spaceId })
      const id = crypto.randomUUID()
      await wasServer.put('posts', id, {
        id: `urn:uuid:${id}`,
        type: 'BlogPost',
        author: session.authorDid,
        title,
        content,
        contentType: 'text/markdown',
        url: `${session.spaceId}/posts/${id}`,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      setTitle('')
      setContent('')
      await onPublished()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ paddingY: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1">
            WAS Connection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            DID: {session.authorDid}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Space ID: {session.spaceId}
          </Typography>
          <Button variant="outlined" size="small" onClick={onSignOut} sx={{ marginTop: 1 }}>
            Sign out
          </Button>
        </Box>

        <Paper
          component="form"
          onSubmit={handlePublish}
          sx={{ padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
            fullWidth
            multiline
            minRows={4}
          />
          <Button type="submit" variant="contained" disabled={pending}>
            Publish
          </Button>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}

        <Divider />

        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            Home
          </Typography>
          {posts.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No posts yet.
            </Typography>
          )}
          <Stack spacing={2}>
            {posts.map((post) => (
              <Card key={post.id} variant="outlined">
                <CardContent>
                  <Typography variant="h6" component="h3">
                    {post.title}
                  </Typography>
                  <Typography variant="body1">{post.content}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
}
