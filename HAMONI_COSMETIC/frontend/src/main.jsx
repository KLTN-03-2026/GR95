import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './routes/index' // Import bộ định tuyến vừa tạo
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css' ;
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)