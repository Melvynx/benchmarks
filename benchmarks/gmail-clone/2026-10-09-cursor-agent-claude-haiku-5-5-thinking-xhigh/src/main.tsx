import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// No StrictMode: compose windows persist drafts on unmount, and StrictMode's double effect run would fire that twice.
createRoot(document.getElementById('root') as HTMLElement).render(<App />);
