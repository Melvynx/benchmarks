import { useStore } from '../../state/store';
import { setPageBackground } from '../../state/actions';
import { ColorSwatch } from '../ColorSwatch';

export const PageProperties = (): JSX.Element => {
  const page = useStore((s) => s.doc.pages[s.doc.currentPageId]);
  if (!page) return <></>;
  return (
    <div className="panel-section">
      <div className="panel-section-title">Page</div>
      <div className="flex items-center gap-1.5">
        <ColorSwatch
          color={page.background}
          opacity={1}
          onChange={(c) => setPageBackground(c)}
        />
        <div className="text-xs text-text-secondary tabular-nums">
          {page.background.toUpperCase()}
        </div>
      </div>
    </div>
  );
};
