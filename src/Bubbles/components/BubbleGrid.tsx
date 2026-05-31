// Render the grid of bubbles. Each cell is positioned absolutely via grid
// row/col + a small jitter so the rows feel real, not snapped.
//
// Bubbles are pure DOM (no canvas) so a popped highlight uses CSS transitions
// and the layout reflows naturally on resize.

import { memo } from 'react';
import './BubbleGrid.less';
import type { Bubble } from '../types';

export type BubbleGridProps = {
  bubbles: Bubble[];
  cols: number;
  rows: number;
  onPop: (id: string, x: number, y: number) => void;
};

const BubbleCell = memo(function BubbleCell({
  bubble, onPop,
}: { bubble: Bubble; onPop: (id: string, x: number, y: number) => void }) {
  const { id, jitterX, jitterY, size, hue, popped } = bubble;
  return (
    <div
      className={`bw-cell ${popped ? 'is-popped' : ''}`}
      style={{
        '--jx': jitterX,
        '--jy': jitterY,
        '--scale': size,
        '--hue': hue,
      } as React.CSSProperties}
      onPointerDown={popped ? undefined : (e) => onPop(id, e.clientX, e.clientY)}
      data-no-feedback
      aria-label={popped ? 'popped' : 'bubble'}
    >
      <div className="bw-cell__skin">
        <div className="bw-cell__hi" />
        <div className="bw-cell__sheen" />
      </div>
      <div className="bw-cell__splash" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>
    </div>
  );
});

function BubbleGrid({ bubbles, cols, rows, onPop }: BubbleGridProps) {
  return (
    <div
      className="bw-grid"
      style={{
        '--cols': cols,
        '--rows': rows,
      } as React.CSSProperties}
    >
      {bubbles.map(b => (
        <div
          key={b.id}
          className="bw-grid__slot"
          style={{
            gridColumn: b.col + 1,
            gridRow: b.row + 1,
          }}
        >
          <BubbleCell bubble={b} onPop={onPop} />
        </div>
      ))}
    </div>
  );
}

export default memo(BubbleGrid);
