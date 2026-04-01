import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DataProvider } from './context/DataContext'
import './style.css'

createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>,
)
