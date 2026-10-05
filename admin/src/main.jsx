import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AdminProvider } from './lib/AdminContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AdminProvider>
        <App />
      </AdminProvider>
    </HashRouter>
  </React.StrictMode>,
);
