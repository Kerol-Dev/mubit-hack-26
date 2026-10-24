import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import App from './App';
import './style.css';
import './redesign.css';
import './journey.css';
import './practice.css';
import './care-studio.css';
import './simple-portal.css';
import './auth.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
