import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/App.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { AppLockProvider } from './context/AppLockContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppLockProvider>
          <App />
        </AppLockProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
