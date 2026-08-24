import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

/**
 * Marketing entry point.
 *
 * Nothing in the served HTML describes the page. The first byte of readable
 * content appears here, after the module graph has downloaded, parsed, and run.
 */
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
