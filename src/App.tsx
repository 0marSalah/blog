import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { WasSessionProvider } from '@interop/was-react'
import { WasConnection } from './WasConnection'
import { theme } from './styles/theme'
import { wasAppConfig, registry } from './wasApp'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WasSessionProvider config={wasAppConfig} registry={registry}>
        <WasConnection />
      </WasSessionProvider>
    </ThemeProvider>
  )
}

export default App
