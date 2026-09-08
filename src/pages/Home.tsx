import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { publicUrlFor, useLogout, useSession } from '@interop/was-react'
import { BLOG_ID, EXPECTED_SERVER_URL } from '../app.config'
import { usePosts } from '../wasApp'
import { ensureBlog, spaceTopology } from '../blog'
import type { Blog } from '../types'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import SvgIcon from '@mui/material/SvgIcon'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { Feed } from './Feed'

// Material's `content_copy` and `check` glyphs, inlined: one icon is not
// worth a dependency on @mui/icons-material.
const COPY_PATH =
  'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'
const CHECK_PATH = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'

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

  const [tab, setTab] = useState<'home' | 'feed'>('home')
  const [copied, setCopied] = useState(false)
  const [blogError, setBlogError] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [blog, setBlog] = useState<Blog | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fall back to the idle icon shortly after a copy, so the button reads as
  // ready again without the user having to do anything.
  useEffect(() => {
    if (!copied) {
      return
    }
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    if (!blog) {
      return
    }
    try {
      await navigator.clipboard.writeText(blog.url)
      setCopied(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // The blog document has to exist before a post can point at it: a post is
  // attributed to the blog's URL, and that URL is only meaningful once
  // something answers at it.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        // Waits on the sync bootstrap internally: `connected` is written
        // before the remote store exists.
        const opened = await ensureBlog({
          name: 'My Blog',
          signingKey: controllerDid ?? '',
        })
        if (cancelled) {
          return
        }
        setBlog(opened)
        setServerUrl(spaceTopology().serverUrl)
        setBlogError(null)
      } catch (err) {
        // Without this the page just goes quiet: no blog URL, a disabled
        // Publish button, and nothing saying why.
        if (!cancelled) {
          setBlogError(err instanceof Error ? err.message : String(err))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [controllerDid])

  // Background sync eventually pulls every post down, but a query reads the
  // Space directly -- render what's actually there now rather than wait on
  // that first pull to land.
  useEffect(() => {
    void (async () => {
      try {
        const { docs } = await query({ equals: { blogId: BLOG_ID } })
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
    if (!blog) {
      setError('The blog document is not ready yet.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const id = crypto.randomUUID()
      await insert({
        id,
        type: 'BlogPost',
        blogId: BLOG_ID,
        attributedTo: blog.url,
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
            Signing key: {controllerDid}
          </Typography>
          {serverUrl && (
            <Typography variant="body2" color="text.secondary">
              Server: {serverUrl}
            </Typography>
          )}
          {blog && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: 'flex-start', marginTop: 0.5 }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ wordBreak: 'break-all' }}
              >
                Blog URL (this is what a follower stores): {blog.url}
              </Typography>
              <Tooltip title={copied ? 'Copied' : 'Copy blog URL'}>
                <IconButton
                  size="small"
                  onClick={() => void handleCopy()}
                  aria-label="Copy blog URL"
                >
                  <SvgIcon fontSize="inherit">
                    <path d={copied ? CHECK_PATH : COPY_PATH} />
                  </SvgIcon>
                </IconButton>
              </Tooltip>
            </Stack>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => logout()}
            sx={{ marginTop: 1 }}
          >
            Sign out
          </Button>
        </Box>

        {serverUrl && serverUrl !== EXPECTED_SERVER_URL && (
          <Alert severity="error">
            This session is on <strong>{serverUrl}</strong>, not{' '}
            {EXPECTED_SERVER_URL}. The server comes from the wallet's grants and
            is frozen into the stored session, so changing the wallet's config
            does not move an already-connected session. Sign out (which clears
            the stored session) and sign in again with the wallet pointed at{' '}
            {EXPECTED_SERVER_URL}.
          </Alert>
        )}

        {blogError && (
          <Alert severity="warning">
            Could not open the blog document: {blogError}
            {blogError.includes('No delegated capability') && (
              <>
                {' '}
                The wallet grants access per collection at login, and this
                session predates the <code>blogs</code> and <code>follows</code>{' '}
                collections. Sign out and sign in again to pick them up.
              </>
            )}
          </Alert>
        )}

        <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
          <Tab label="Home" value="home" />
          <Tab label="Feed" value="feed" />
        </Tabs>

        {tab === 'feed' && <Feed />}

        {tab === 'home' && (
        <Stack spacing={3}>
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
          <Button type="submit" variant="contained" disabled={pending || !blog}>
            Publish
          </Button>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}

        <Divider />

        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            Your posts
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
        )}
      </Stack>
    </Container>
  )
}
