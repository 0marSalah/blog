import { useCallback, useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useFollows } from '../wasApp'
import { fetchBlog, loadFeed, type FeedError, type FeedItem } from '../feed'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

/**
 * The follow feed -- Mastodon's Home timeline, minus the server.
 *
 * Following is one-directional and needs no consent: paste a blog URL, and
 * the reader resolves it, finds `postsUrl`, and pulls. The followed author is
 * never contacted and never learns about it.
 */
export function Feed() {
  const follows = useFollows(useShallow((state) => [...state.byId.values()]))
  const insertFollow = useFollows((state) => state.insert)
  const removeFollow = useFollows((state) => state.remove)
  const hydrateFollows = useFollows((state) => state.hydrate)

  const [items, setItems] = useState<FeedItem[]>([])
  const [errors, setErrors] = useState<FeedError[]>([])
  const [blogUrl, setBlogUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void hydrateFollows().catch((err) => {
      console.error('Failed to hydrate follows:', err)
    })
  }, [hydrateFollows])

  // No synchronous state update here: the pull is the external system, and
  // everything this sets lands after the await.
  const refresh = useCallback(async () => {
    const result = await loadFeed(follows)
    setItems(result.items)
    setErrors(result.errors)
    setLoading(false)
  }, [follows])

  // Re-pull whenever the follow set changes. There is no push side, so this
  // and the refresh button are the only things that make the timeline move.
  useEffect(() => {
    // The rule reads `refresh` as setting state synchronously; every one of
    // its updates lands after an await, which the static walk cannot see.
    // eslint-disable-next-line react/set-state-in-effect
    void refresh()
  }, [refresh])

  async function handleRefresh() {
    setLoading(true)
    await refresh()
  }

  async function handleFollow(event: React.FormEvent) {
    event.preventDefault()
    setAdding(true)
    setError(null)
    try {
      const url = blogUrl.trim()
      if (follows.some((follow) => follow.blogUrl === url)) {
        throw new Error('Already following that blog.')
      }
      // Resolve before storing: a URL that answers with a blog document is
      // the only evidence the follow will ever work, and it costs one GET.
      const blog = await fetchBlog(url)
      if (!blog || blog.type !== 'Blog') {
        throw new Error('No public blog document at that URL.')
      }
      const now = new Date().toISOString()
      await insertFollow({
        id: crypto.randomUUID(),
        type: 'Follow',
        blogUrl: url,
        name: blog.name,
        followedAt: now,
      })
      setBlogUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAdding(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Paper
        component="form"
        onSubmit={handleFollow}
        sx={{ padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <Typography variant="h6" component="h2">
          Follow a blog
        </Typography>
        <TextField
          label="Blog URL"
          placeholder="https://freewallet.cloud/space/<spaceId>/blogs/blog"
          value={blogUrl}
          onChange={(event) => setBlogUrl(event.target.value)}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" disabled={adding}>
          Follow
        </Button>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {follows.length > 0 && (
        <Box>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {follows.map((follow) => (
              <Chip
                key={follow.id}
                label={follow.name ?? follow.blogUrl}
                onDelete={() => void removeFollow(follow.id)}
                size="small"
              />
            ))}
          </Stack>
        </Box>
      )}

      {errors.map((feedError) => (
        <Alert severity="warning" key={feedError.blogUrl}>
          {feedError.blogUrl}: {feedError.message}
        </Alert>
      ))}

      <Divider />

      <Box>
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 1,
          }}
        >
          <Typography variant="h5" component="h2">
            Timeline
          </Typography>
          <Button size="small" onClick={() => void handleRefresh()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Stack>

        {follows.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Not following anyone yet. Paste a blog URL above.
          </Typography>
        )}
        {follows.length > 0 && items.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary">
            Nothing published yet by anyone you follow.
          </Typography>
        )}

        <Stack spacing={2}>
          {items.map((item) => (
            <Card key={item.post.url || item.post.id} variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {item.blogName} &middot;{' '}
                  {new Date(item.post.publishedAt).toLocaleString()}
                </Typography>
                <Typography variant="h6" component="h3">
                  {item.post.title}
                </Typography>
                <Typography variant="body1">{item.post.content}</Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    </Stack>
  )
}
