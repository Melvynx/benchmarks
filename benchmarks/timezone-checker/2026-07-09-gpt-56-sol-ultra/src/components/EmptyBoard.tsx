import { MapPinned, Plus } from 'lucide-react';

export function EmptyBoard() {
  return (
    <section className="empty-board">
      <span className="empty-board__icon" aria-hidden="true"><MapPinned size={28} /></span>
      <p className="eyebrow">Your board is empty</p>
      <h2>Start with one place</h2>
      <p>Use “Add a city” above to create a new timezone comparison.</p>
      <span className="empty-board__pointer" aria-hidden="true"><Plus size={15} /> Search the catalog</span>
    </section>
  );
}
