/**
 * EasyFindBot — Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { TranslationProvider } from './locales/index.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { App } from './App.jsx';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <TranslationProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </TranslationProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}
