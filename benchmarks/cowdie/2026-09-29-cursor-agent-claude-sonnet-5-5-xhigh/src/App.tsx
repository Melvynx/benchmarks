import { BottomBar } from './ui/Bottom';
import { TopBar } from './ui/Hud';
import { SceneView } from './ui/SceneView';
import { LiveRegion, Toasts } from './ui/Toasts';

export default function App() {
  return (
    <div className="app">
      <SceneView />
      <div className="vignette" aria-hidden="true" />
      <TopBar />
      <BottomBar />
      <Toasts />
      <LiveRegion />
    </div>
  );
}
