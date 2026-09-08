import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TasksApp from './tasks/TasksApp'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TasksApp />
  </StrictMode>,
)
