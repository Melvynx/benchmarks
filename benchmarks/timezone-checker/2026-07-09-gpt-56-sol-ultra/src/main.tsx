import '@fontsource-variable/manrope/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
