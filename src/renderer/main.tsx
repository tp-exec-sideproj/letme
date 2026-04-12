import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AnswerOverlay from './AnswerOverlay'
import './styles/index.css'

const isAnswerOverlay = new URLSearchParams(window.location.search).get('overlay') === 'answer'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAnswerOverlay ? <AnswerOverlay /> : <App />}
  </React.StrictMode>
)
