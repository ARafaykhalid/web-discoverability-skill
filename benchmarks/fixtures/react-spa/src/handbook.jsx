import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import HandbookApp from './HandbookApp.jsx';

/**
 * Documentation entry point.
 *
 * A second bundle for the handbook section, mounted into the second HTML entry
 * declared in vite.config.js. It shares useDocumentHead with the marketing
 * bundle, which is how the hard-coded canonical in handbook.html ends up being
 * replaced during mount rather than left alone.
 */
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HandbookApp />
    </BrowserRouter>
  </React.StrictMode>,
);
