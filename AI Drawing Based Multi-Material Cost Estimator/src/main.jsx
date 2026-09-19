import React from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './state/store.jsx'
import { ConfirmProvider } from './components/Confirm.jsx'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfirmProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ConfirmProvider>
  </React.StrictMode>,
)
