import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { installShortcuts } from './input/shortcuts';
import { installAutosaveLifecycle } from './store/autosave';
import { reflowDocument } from './store/docEdit';
import { bootDocuments } from './store/documents';
import { bumpFontsTick } from './store/store';
import { onFontsChanged, preloadCoreFonts } from './text/fonts';
import { invalidateTextLayouts } from './text/textLayout';
import './styles/app.css';

installShortcuts();
installAutosaveLifecycle();
bootDocuments();

// Webfonts arriving late change text metrics: re-measure, re-layout, repaint.
onFontsChanged(() => {
  invalidateTextLayouts();
  reflowDocument();
  bumpFontsTick();
});
void preloadCoreFonts();

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
