import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fredoka';
import './styles.css';
import App from './App';
import { startGameLoop } from './game/store';

startGameLoop();
createRoot(document.getElementById('root')!).render(<App />);
