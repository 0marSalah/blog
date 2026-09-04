import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { publicUrlFor, useLogout, useSession } from '@interop/was-react'
import { usePosts } from '../wasApp'
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
 * Protected: only ever rendered once `WasConnection` sees a connected
 * session. Reads and writes go through the `posts` entity store -- no
 * manual `WasClient` calls, no manual list-then-fetch. `was-react` owns the
 * local replica and the background sync to the server.
 */
export function Home() {
  const { controllerDid } = useSession()
  const logout = useLogout()
  const posts = usePosts(useShallow((state) => [...state.byId.values()]))
  const insert = usePosts((state) => state.insert)
  const query = usePosts((state) => state.query)
  const patch = usePosts((state) => state.patch)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Background sync eventually pulls every post down, but a query reads the
  // Space directly -- render what's actually there now rather than wait on
  // that first pull to land.
  useEffect(() => {
    void (async () => {
      try {
        const { docs } = await query({ equals: { blogId: 'blog' } })
        for (const doc of docs) {
          patch(doc)
        }
      } catch (err) {
        console.error('Failed to load posts from the Space:', err)
      }
    })()
  }, [query, patch])

  async function handlePublish(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const id = crypto.randomUUID()
      await insert({
        id,
        type: 'BlogPost',
        blogId: 'blog',
        author: controllerDid ?? '',
        title,
        content,
        contentType: 'text/markdown',
        url: publicUrlFor({ collectionKey: 'posts', id }),
        publishedAt: new Date().toISOString(),
      })
      setTitle('')
      setContent('')
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
            DID: {controllerDid}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => logout()}
            sx={{ marginTop: 1 }}
          >
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
