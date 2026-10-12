import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/google-sans-flex/wght.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/400-italic.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'material-symbols/outlined.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/list.css';
import './styles/thread.css';
import './styles/compose.css';
import './styles/pages.css';
import './styles/mobile.css';
import './styles/print.css';
import App from './App';
import { getState } from './lib/store';
import { applyPrefs } from './lib/hooks';

applyPrefs(getState().settings);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
