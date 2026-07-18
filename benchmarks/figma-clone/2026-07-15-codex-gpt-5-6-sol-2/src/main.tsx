import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { EditorErrorBoundary } from '@/app/EditorErrorBoundary';
import '@/styles.css';

const rootElement = document.querySelector<HTMLDivElement>('#root');

if (!rootElement) {
  throw new Error('Editor root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <EditorErrorBoundary>
      <App />
    </EditorErrorBoundary>
  </StrictMode>,
);
