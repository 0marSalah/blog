import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

/**
 * Renders a post body.
 *
 * Posts are stored as `text/markdown` and were long displayed as raw text, so
 * the content type was a promise nothing kept. Parsing is `react-markdown`'s
 * job -- a hand-written subset was tried first and got nested emphasis wrong
 * and fenced code blocks not at all, which is the usual lesson about writing
 * your own markdown parser.
 *
 * What this module still owns is the part a library cannot know: how a post
 * should LOOK in this app's type scale. Everything below is that mapping.
 *
 * `react-markdown` builds React elements rather than an HTML string, so there
 * is no `dangerouslySetInnerHTML` here and no sanitizer to keep current --
 * which matters because post bodies come from the strangers you follow, the
 * one class of input this app renders that it did not author.
 */

/**
 * `remark-breaks` is deliberate, not decorative. Strict markdown folds a lone
 * newline into a space; people write these posts in a plain textarea where
 * Enter looks like a line break, and the renderer this replaced was
 * `white-space: pre-wrap`. Without it every post already published would
 * silently reflow.
 */
const PLUGINS = [remarkGfm, remarkBreaks]

/**
 * Link targets this app will render as links.
 *
 * `react-markdown` already blocks `javascript:` by default; this narrows the
 * list further to the three schemes a blog post has any business linking to.
 * A rejected URL keeps its text and loses its destination, which is visible
 * and inert rather than silently dropped.
 *
 * @param url {string}
 * @returns {string}   the URL, or `''` to drop it
 */
function safeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin)
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? parsed.toString() : ''
  } catch {
    return ''
  }
}

// Two heading levels, not six: the post's own title already occupies the top
// of the scale, so anything below `h4` would have nowhere to sit.
const MAJOR = { variant: 'h3', sx: { marginTop: 3.5, marginBottom: 1 } } as const
const MINOR = { variant: 'h4', sx: { marginTop: 3, marginBottom: 1 } } as const

const listSx = {
  marginY: 2,
  paddingLeft: 3,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
} as const

// Every override discards `node` -- `react-markdown` passes the mdast node
// alongside the DOM props, and spreading it onto an element would reach the
// DOM as an unknown attribute.
const components: Components = {
  h1: ({ node: _node, ...props }) => <Typography {...MAJOR} component="h3" {...props} />,
  h2: ({ node: _node, ...props }) => <Typography {...MAJOR} component="h3" {...props} />,
  h3: ({ node: _node, ...props }) => <Typography {...MAJOR} component="h3" {...props} />,
  h4: ({ node: _node, ...props }) => <Typography {...MINOR} component="h4" {...props} />,
  h5: ({ node: _node, ...props }) => <Typography {...MINOR} component="h5" {...props} />,
  h6: ({ node: _node, ...props }) => <Typography {...MINOR} component="h6" {...props} />,

  p: ({ node: _node, ...props }) => <Typography variant="body1" sx={{ marginBottom: 2 }} {...props} />,

  a: ({ node: _node, href, ...props }) => (
    <Link href={href} target="_blank" rel="noreferrer noopener" {...props} />
  ),

  ul: ({ node: _node, ...props }) => <Typography variant="body1" component="ul" sx={listSx} {...props} />,
  ol: ({ node: _node, ...props }) => <Typography variant="body1" component="ol" sx={listSx} {...props} />,

  blockquote: ({ node: _node, ...props }) => (
    <Box
      component="blockquote"
      sx={{
        margin: 0,
        marginY: 2.5,
        paddingLeft: 2.5,
        borderLeft: 2,
        borderColor: 'primary.main',
        color: 'text.secondary',
        fontStyle: 'italic',
        '& > :last-child': { marginBottom: 0 },
      }}
      {...props}
    />
  ),

  // Inline code. A fenced block is a `code` inside a `pre`, and `pre` below
  // resets these rules for its own child -- the one reliable way to tell the
  // two apart now that `react-markdown` no longer passes an `inline` flag.
  code: ({ node: _node, ...props }) => (
    <Box
      component="code"
      sx={{
        backgroundColor: 'action.hover',
        paddingInline: '0.32em',
        paddingBlock: '0.1em',
        borderRadius: 1,
        fontSize: '0.88em',
      }}
      {...props}
    />
  ),

  pre: ({ node: _node, ...props }) => (
    <Box
      component="pre"
      sx={{
        marginY: 2.5,
        padding: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        backgroundColor: 'background.paper',
        overflowX: 'auto',
        fontSize: '0.85rem',
        lineHeight: 1.6,
        '& code': { backgroundColor: 'transparent', padding: 0, fontSize: 'inherit' },
      }}
      {...props}
    />
  ),

  hr: () => <Divider sx={{ marginY: 3 }} />,

  img: ({ node: _node, ...props }) => (
    <Box component="img" sx={{ maxWidth: '100%', height: 'auto', display: 'block', marginY: 2 }} {...props} />
  ),

  // A table is the one block that can outgrow the column, so it scrolls in its
  // own container rather than pushing the page sideways.
  table: ({ node: _node, ...props }) => (
    <Box sx={{ overflowX: 'auto', marginY: 2.5 }}>
      <Box
        component="table"
        sx={{
          borderCollapse: 'collapse',
          width: '100%',
          fontSize: '0.95rem',
          '& th, & td': { border: 1, borderColor: 'divider', padding: 1, textAlign: 'left' },
          '& th': { fontFamily: (theme) => theme.typography.body2.fontFamily, fontWeight: 600 },
        }}
        {...props}
      />
    </Box>
  ),
}

/**
 * Renders a markdown string in the app's reading voice.
 *
 * @param props {object}
 * @param props.source {string}
 * @returns {ReactNode}
 */
export function Markdown({ source }: { source: string }) {
  return (
    <Box sx={{ '& > :first-of-type': { marginTop: 0 }, '& > :last-child': { marginBottom: 0 } }}>
      <ReactMarkdown remarkPlugins={PLUGINS} urlTransform={safeUrl} components={components}>
        {source}
      </ReactMarkdown>
    </Box>
  )
}
