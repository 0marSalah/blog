import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { WasConnection } from './WasConnection'
import { theme } from './styles/theme'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WasConnection />
    </ThemeProvider>
  )
}

export default App
