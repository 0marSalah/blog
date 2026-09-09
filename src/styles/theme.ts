import { createTheme } from '@mui/material/styles'

/**
 * The app's visual identity: a reading surface first, an interface second.
 *
 * Two faces do the work. `Newsreader` -- an editorial serif -- carries the
 * masthead, headings and post bodies, because those are the parts anyone
 * actually reads. `Archivo` handles the interface around them: labels,
 * buttons, form fields, meta. Keeping the two jobs on two faces is what makes
 * a post look like writing rather than like UI copy.
 *
 * The ground is a cool near-black and the text a warm off-white. The slight
 * temperature difference is deliberate: it reads as ink on paper rather than
 * as grey on grey, which is what a flat neutral pair gives you.
 */

const SERIF = "'Newsreader', Georgia, 'Times New Roman', serif"
const SANS = "'Archivo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace"

const INK = '#121316'
const SURFACE = '#191b1f'
const RAISED = '#212429'
const LINE = '#282c33'
const TEXT = '#e9e5de'
const MUTED = '#9a9fa8'
const OCHRE = '#c9a15c'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: INK, paper: SURFACE },
    primary: { main: OCHRE, contrastText: INK },
    text: { primary: TEXT, secondary: MUTED },
    divider: LINE,
    success: { main: '#7fb58c' },
    error: { main: '#e08585' },
    warning: { main: '#d6a552' },
    info: { main: '#8fa8c8' },
  },

  shape: { borderRadius: 4 },

  typography: {
    fontFamily: SANS,
    // The masthead. `opsz` is why Newsreader holds up this large without
    // looking like body text that was simply scaled.
    h1: { fontFamily: SERIF, fontWeight: 500, fontSize: '2.6rem', lineHeight: 1.1, letterSpacing: '-0.02em' },
    h2: { fontFamily: SERIF, fontWeight: 500, fontSize: '1.9rem', lineHeight: 1.2, letterSpacing: '-0.01em' },
    h3: { fontFamily: SERIF, fontWeight: 500, fontSize: '1.5rem', lineHeight: 1.25 },
    h4: { fontFamily: SERIF, fontWeight: 500, fontSize: '1.35rem', lineHeight: 1.3 },
    h5: { fontFamily: SANS, fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase' },
    h6: { fontFamily: SANS, fontWeight: 600, fontSize: '0.98rem', letterSpacing: '0.01em' },
    // `body1` is the reading voice: post content is rendered with it, so it
    // gets the serif and a generous measure. `body2` stays interface text.
    body1: { fontFamily: SERIF, fontSize: '1.06rem', lineHeight: 1.7 },
    body2: { fontFamily: SANS, fontSize: '0.875rem', lineHeight: 1.6 },
    caption: { fontFamily: SANS, fontSize: '0.75rem', letterSpacing: '0.02em' },
    button: { fontFamily: SANS, fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.02em', textTransform: 'none' },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: INK },
        // Long DIDs and URLs are data, not prose -- they get the mono face
        // wherever they appear.
        code: { fontFamily: MONO, fontSize: '0.85em' },
      },
    },

    // Flat by default. A shadow says "this floats"; nothing here does, and
    // one border weight across the app keeps the hierarchy in the type
    // instead of in the boxes.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none', border: `1px solid ${LINE}`, backgroundColor: SURFACE },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundColor: RAISED } },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          paddingInline: '1rem',
          '&.MuiButton-containedPrimary:hover': { backgroundColor: '#d8b273' },
          '&.MuiButton-outlined': {
            borderColor: LINE,
            '&:hover': { borderColor: OCHRE, backgroundColor: 'transparent' },
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 0, borderBottom: `1px solid ${LINE}` },
        indicator: { height: 2, backgroundColor: OCHRE },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: '0.72rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          minHeight: 0,
          paddingBlock: '0.85rem',
          paddingInline: 0,
          marginRight: '1.75rem',
          minWidth: 0,
          color: MUTED,
          '&.Mui-selected': { color: TEXT },
        },
      },
    },

    MuiTextField: { defaultProps: { variant: 'outlined' } },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: INK,
          '& fieldset': { borderColor: LINE },
          '&:hover fieldset': { borderColor: '#3a4048' },
          // The composer is where writing happens, so its field reads in the
          // same voice the published post will.
          '& textarea': { fontFamily: SERIF, fontSize: '1.02rem', lineHeight: 1.65 },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { fontFamily: SANS, fontSize: '0.9rem' },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: SANS,
          fontSize: '0.86rem',
          border: `1px solid ${LINE}`,
          borderRadius: 4,
          '&.MuiAlert-standardInfo': { backgroundColor: 'rgba(143,168,200,0.08)' },
          '&.MuiAlert-standardWarning': { backgroundColor: 'rgba(214,165,82,0.08)' },
          '&.MuiAlert-standardError': { backgroundColor: 'rgba(224,133,133,0.08)' },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontFamily: SANS, fontSize: '0.72rem', letterSpacing: '0.02em' },
        outlined: { borderColor: LINE },
      },
    },

    MuiDivider: { styleOverrides: { root: { borderColor: LINE } } },

    MuiLink: {
      styleOverrides: {
        root: { color: OCHRE, textDecorationColor: 'rgba(201,161,92,0.4)', textUnderlineOffset: '2px' },
      },
    },
  },
})
