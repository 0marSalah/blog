import { useRef, useState } from 'react'
import { publicUrlFor } from '@interop/was-react'
import { BLOG_ID } from '../app.config'
import { usePosts } from '../wasApp'
import { Markdown } from '../markdown'
import type { Blog } from '../types'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Stack from '@mui/material/Stack'
import SvgIcon from '@mui/material/SvgIcon'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

/**
 * One edit to the draft: the span to replace, the text to put there, and where
 * the caret should end up. Kept as data rather than applied inline so the
 * toolbar's behaviour is pure string arithmetic, separate from the textarea
 * mechanics that put it into the DOM.
 */
interface Edit {
  from: number
  to: number
  insert: string
  selectionStart: number
  selectionEnd: number
}

/** Every block marker, so switching one kind for another never stacks them. */
const ANY_BLOCK = /^(#{1,6}\s+|>\s?|[-*]\s+|\d+\.\s+)/

const BLOCK_KINDS = {
  heading2: { own: /^#{1,2}\s+/, prefix: () => '## ' },
  heading3: { own: /^#{3}\s+/, prefix: () => '### ' },
  quote: { own: /^>\s?/, prefix: () => '> ' },
  bullet: { own: /^[-*]\s+/, prefix: () => '- ' },
  ordered: { own: /^\d+\.\s+/, prefix: (line: number) => `${line + 1}. ` },
} as const

/**
 * Wraps (or unwraps) the selection in an inline marker such as `**`.
 *
 * Unwrapping handles both shapes a user can produce: markers just outside the
 * selection, which is what you get by re-pressing the button after the first
 * press left the text selected, and markers inside it, which is what you get
 * by selecting the formatted run by hand.
 *
 * @param value {string}
 * @param start {number}
 * @param end {number}
 * @param marker {string}
 * @param placeholder {string}   inserted and selected when nothing is
 * @returns {Edit}
 */
function wrapEdit(
  value: string,
  start: number,
  end: number,
  marker: string,
  placeholder: string
): Edit {
  const selected = value.slice(start, end)
  const width = marker.length

  if (value.slice(start - width, start) === marker && value.slice(end, end + width) === marker) {
    return {
      from: start - width,
      to: end + width,
      insert: selected,
      selectionStart: start - width,
      selectionEnd: start - width + selected.length,
    }
  }

  if (selected.length >= width * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(width, -width)
    return { from: start, to: end, insert: inner, selectionStart: start, selectionEnd: start + inner.length }
  }

  const text = selected || placeholder
  return {
    from: start,
    to: end,
    insert: `${marker}${text}${marker}`,
    selectionStart: start + width,
    selectionEnd: start + width + text.length,
  }
}

/**
 * Applies a block marker to every line the selection touches, or strips it
 * when they all already carry it -- the toggle people expect from a toolbar.
 *
 * The selection is first widened to whole lines, because a block marker
 * belongs to a line rather than to the characters someone happened to select.
 *
 * @param value {string}
 * @param start {number}
 * @param end {number}
 * @param kind {keyof typeof BLOCK_KINDS}
 * @returns {Edit}
 */
function blockEdit(value: string, start: number, end: number, kind: keyof typeof BLOCK_KINDS): Edit {
  const { own, prefix } = BLOCK_KINDS[kind]
  const from = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = value.indexOf('\n', end)
  const to = lineEnd === -1 ? value.length : lineEnd

  const lines = value.slice(from, to).split('\n')
  const filled = lines.filter((line) => line.trim() !== '')
  const active = filled.length > 0 && filled.every((line) => own.test(line))

  const bare = lines.map((line) => line.replace(ANY_BLOCK, ''))
  const next = active ? bare : bare.map((line, i) => (line.trim() === '' ? line : prefix(i) + line))
  const insert = next.join('\n')

  return { from, to, insert, selectionStart: from, selectionEnd: from + insert.length }
}

/**
 * Inserts a link, leaving `url` selected so it can be typed over immediately
 * -- the address is the part the writer still has to supply.
 *
 * @param value {string}
 * @param start {number}
 * @param end {number}
 * @returns {Edit}
 */
function linkEdit(value: string, start: number, end: number): Edit {
  const text = value.slice(start, end) || 'text'
  const insert = `[${text}](url)`
  const urlAt = start + text.length + 3
  return { from: start, to: end, insert, selectionStart: urlAt, selectionEnd: urlAt + 3 }
}

const ICONS = {
  quote: 'M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z',
  bullet:
    'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
  ordered:
    'M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z',
  link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
  code: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
} as const

/**
 * One toolbar control. The `kind` discriminant is what lets a separator, a
 * letterform button (B, I, H2) and an icon button share one array without
 * each render site having to re-check which fields are present.
 */
type Tool =
  | { kind: 'divider'; key: string }
  | {
      kind: 'text'
      key: string
      label: string
      hint: string
      chord?: string
      weight?: number
      italic?: boolean
      command: Command
    }
  | { kind: 'icon'; key: string; icon: string; hint: string; chord?: string; command: Command }

/**
 * What a toolbar press does, as data rather than as a closure. That is what
 * lets the table below live at module scope -- one array for the life of the
 * app instead of a fresh set of functions on every keystroke -- and it gives
 * the keyboard shortcuts something to name without duplicating the toolbar.
 */
type Command =
  | { type: 'wrap'; marker: string; placeholder: string }
  | { type: 'block'; kind: keyof typeof BLOCK_KINDS }
  | { type: 'link' }

const BOLD: Command = { type: 'wrap', marker: '**', placeholder: 'bold text' }
const ITALIC: Command = { type: 'wrap', marker: '*', placeholder: 'italic text' }
const LINK: Command = { type: 'link' }

const TOOLS: Tool[] = [
  { kind: 'text', key: 'bold', label: 'B', hint: 'Bold', chord: '⌘B', weight: 700, command: BOLD },
  { kind: 'text', key: 'italic', label: 'I', hint: 'Italic', chord: '⌘I', italic: true, command: ITALIC },
  { kind: 'icon', key: 'code', icon: ICONS.code, hint: 'Code', command: { type: 'wrap', marker: '`', placeholder: 'code' } },
  { kind: 'divider', key: 'd1' },
  { kind: 'text', key: 'h2', label: 'H2', hint: 'Heading', command: { type: 'block', kind: 'heading2' } },
  { kind: 'text', key: 'h3', label: 'H3', hint: 'Subheading', command: { type: 'block', kind: 'heading3' } },
  { kind: 'divider', key: 'd2' },
  { kind: 'icon', key: 'quote', icon: ICONS.quote, hint: 'Quote', command: { type: 'block', kind: 'quote' } },
  { kind: 'icon', key: 'bullet', icon: ICONS.bullet, hint: 'Bulleted list', command: { type: 'block', kind: 'bullet' } },
  { kind: 'icon', key: 'ordered', icon: ICONS.ordered, hint: 'Numbered list', command: { type: 'block', kind: 'ordered' } },
  { kind: 'divider', key: 'd3' },
  { kind: 'icon', key: 'link', icon: ICONS.link, hint: 'Link', chord: '⌘K', command: LINK },
]

/** The chords that mirror a toolbar button. */
const SHORTCUTS: Record<string, Command> = { b: BOLD, i: ITALIC, k: LINK }

/**
 * Turns a command into the edit it describes, against a live selection.
 *
 * @param command {Command}
 * @param value {string}
 * @param start {number}
 * @param end {number}
 * @returns {Edit}
 */
function editFor(command: Command, value: string, start: number, end: number): Edit {
  if (command.type === 'wrap') {
    return wrapEdit(value, start, end, command.marker, command.placeholder)
  }
  if (command.type === 'block') {
    return blockEdit(value, start, end, command.kind)
  }
  return linkEdit(value, start, end)
}

/**
 * Writing a post, on its own screen.
 *
 * No boxes and no field labels: an editor that looks like a form makes
 * writing feel like data entry. The two inputs are borderless and set in the
 * same serif the published post will use, so the draft on screen is roughly
 * the thing being made.
 *
 * The toolbar writes MARKDOWN into that same textarea rather than switching to
 * a rich-text surface. Posts are stored as `text/markdown` and read by other
 * clients, so the source has to stay the thing being edited -- and it keeps
 * the draft legible to someone who would rather just type the syntax. Preview
 * is one press away because markdown you cannot see is markdown you cannot
 * trust.
 */
export function Compose({ blog, onDone }: { blog: Blog; onDone: () => void }) {
  const insert = usePosts((state) => state.insert)
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = title.trim().length > 0 && content.trim().length > 0

  /**
   * Puts an `Edit` into the textarea.
   *
   * `execCommand('insertText')` is deprecated but still the only way to write
   * into a textarea and have the browser record it on its own undo stack, so
   * Cmd-Z after a toolbar press undoes one formatting step instead of the
   * whole draft. React sees the resulting `input` event and `content` updates
   * as usual. The direct write is kept as a fallback for anywhere it fails.
   */
  function apply(edit: Edit) {
    const field = bodyRef.current
    if (!field) {
      return
    }
    field.focus()
    field.setSelectionRange(edit.from, edit.to)

    let inserted = false
    try {
      inserted = document.execCommand('insertText', false, edit.insert)
    } catch {
      inserted = false
    }
    if (!inserted) {
      setContent((value) => value.slice(0, edit.from) + edit.insert + value.slice(edit.to))
    }

    requestAnimationFrame(() => {
      field.setSelectionRange(edit.selectionStart, edit.selectionEnd)
    })
  }

  function run(command: Command) {
    const field = bodyRef.current
    if (!field) {
      return
    }
    apply(editFor(command, field.value, field.selectionStart, field.selectionEnd))
  }

  function handleShortcut(event: React.KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) {
      return
    }
    const command = SHORTCUTS[event.key.toLowerCase()]
    if (command) {
      event.preventDefault()
      run(command)
    }
  }

  async function handlePublish() {
    setPending(true)
    setError(null)
    try {
      const id = crypto.randomUUID()
      await insert({
        id,
        type: 'BlogPost',
        blogId: BLOG_ID,
        attributedTo: blog.url,
        title: title.trim(),
        content,
        contentType: 'text/markdown',
        url: publicUrlFor({ collectionKey: 'posts', id }),
        publishedAt: new Date().toISOString(),
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPending(false)
    }
  }


  return (
    <Stack spacing={2} sx={{ maxWidth: '42rem', width: '100%', marginX: 'auto' }}>
      <InputBase
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Title"
        multiline
        autoFocus
        sx={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: '2.35rem',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          '& .MuiInputBase-input::placeholder': { color: 'text.secondary', opacity: 0.5 },
        }}
      />

      <Stack
        direction="row"
        spacing={0.25}
        sx={{
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.25,
          paddingY: 0.5,
          borderTop: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {TOOLS.map((tool) =>
          tool.kind === 'divider' ? (
            <Divider key={tool.key} orientation="vertical" flexItem sx={{ marginX: 0.75, marginY: 0.75 }} />
          ) : (
            <Tooltip
              key={tool.key}
              title={tool.chord ? `${tool.hint}  ${tool.chord}` : tool.hint}
              disableInteractive
            >
              <span>
                <IconButton
                  size="small"
                  onClick={() => run(tool.command)}
                  disabled={preview}
                  aria-label={tool.hint}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary', backgroundColor: 'action.hover' },
                  }}
                >
                  {tool.kind === 'icon' ? (
                    <SvgIcon sx={{ fontSize: '1.15rem' }}>
                      <path d={tool.icon} />
                    </SvgIcon>
                  ) : (
                    <Box
                      component="span"
                      sx={{
                        // The letterforms are the specimen: B and I are shown
                        // in the serif they will produce, the heading buttons
                        // in the interface face, because those are labels.
                        fontFamily: tool.label.length === 1 ? "'Newsreader', Georgia, serif" : undefined,
                        fontSize: tool.label.length > 1 ? '0.78rem' : '1.02rem',
                        fontWeight: tool.weight ?? 600,
                        fontStyle: tool.italic ? 'italic' : undefined,
                        lineHeight: 1,
                      }}
                    >
                      {tool.label}
                    </Box>
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Button
          size="small"
          variant="text"
          color="inherit"
          onClick={() => setPreview((on) => !on)}
          sx={{ color: preview ? 'primary.main' : 'text.secondary', minWidth: 0 }}
        >
          {preview ? 'Write' : 'Preview'}
        </Button>
      </Stack>

      {preview ? (
        <Box sx={{ minHeight: '18rem', paddingTop: 1 }}>
          {content.trim() ? (
            <Markdown source={content} />
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ opacity: 0.5 }}>
              Nothing to preview yet.
            </Typography>
          )}
        </Box>
      ) : (
        <InputBase
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleShortcut}
          inputRef={bodyRef}
          placeholder="Tell your story..."
          multiline
          minRows={12}
          sx={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: '1.12rem',
            lineHeight: 1.75,
            '& .MuiInputBase-input::placeholder': { color: 'text.secondary', opacity: 0.5 },
          }}
        />
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Box>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', paddingTop: 2, borderTop: 1, borderColor: 'divider' }}
        >
          <Button
            variant="contained"
            onClick={() => void handlePublish()}
            disabled={pending || !ready}
            sx={{ borderRadius: 999, paddingX: 2.5 }}
          >
            {pending ? 'Publishing...' : 'Publish'}
          </Button>
          <Button variant="text" color="inherit" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            Publishing to {blog.name}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  )
}
