import { useUI } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/primitives';

export function ConfirmDialog() {
  const confirm = useUI((s) => s.confirm);
  const close = useUI((s) => s.closeConfirm);
  if (!confirm) return null;

  return (
    <Modal
      title={confirm.title}
      onClose={close}
      width="sm:max-w-md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            variant={confirm.danger ? 'danger' : 'primary'}
            size="sm"
            onClick={() => {
              confirm.onConfirm();
              close();
            }}
          >
            {confirm.confirmLabel}
          </Button>
        </>
      }
    >
      {confirm.body && <p className="px-5 py-4 text-sm text-ink-2">{confirm.body}</p>}
    </Modal>
  );
}
