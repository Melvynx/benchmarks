import { useMail } from '../../store/mailStore';
import { useMediaQuery } from '../../hooks/useApp';
import { useUI } from '../../store/uiStore';
import { ComposeForm } from './ComposeForm';

const WINDOW_GAP = 560;

/** Renders every open compose window. Phones get one full-screen editor for the most recent draft. */
export function ComposeWindows() {
  const composeIds = useUI((s) => s.composeIds);
  const minimizedIds = useUI((s) => s.minimizedIds);
  const maximizedId = useUI((s) => s.maximizedId);
  const drafts = useMail((s) => s.data.drafts);
  const mobile = useMediaQuery('(max-width: 767px)');

  const shown = mobile ? composeIds.slice(-1) : composeIds;

  return (
    <>
      {shown.map((id, index) => {
        const draft = drafts.find((d) => d.id === id);
        if (!draft) return null;
        return (
          <ComposeForm
            key={id}
            initial={draft}
            mobile={mobile}
            minimized={!mobile && minimizedIds.includes(id)}
            maximized={!mobile && maximizedId === id}
            offset={(shown.length - 1 - index) * WINDOW_GAP}
          />
        );
      })}
    </>
  );
}
