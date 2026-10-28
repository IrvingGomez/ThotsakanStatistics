import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import LoginGate from './components/LoginGate'
import './style.css'

createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <AuthProvider>
      <LoginGate>
        <DataProvider>
          <App />
        </DataProvider>
      </LoginGate>
    </AuthProvider>
  </React.StrictMode>,
)
