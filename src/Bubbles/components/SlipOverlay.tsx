// A single fortune slip that drops in from the popped bubble's position,
// floats up briefly, and lands in the pocket. After a few seconds it fades.

import { useEffect, useState } from 'react';
import './SlipOverlay.less';

export type SlipOverlayProps = {
  text: string;
  startX: number;
  startY: number;
  onDone: () => void;
};

export default function SlipOverlay({ text, startX, startY, onDone }: SlipOverlayProps) {
  const [phase, setPhase] = useState<'drop' | 'rest' | 'gone'>('drop');
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('rest'), 900);
    const t2 = setTimeout(() => setPhase('gone'), 3800);
    const t3 = setTimeout(onDone, 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={`bw-slip bw-slip--${phase}`}
      style={{ '--sx': `${startX}px`, '--sy': `${startY}px` } as React.CSSProperties}
      role="alert"
    >
      <div className="bw-slip__paper">
        <span className="bw-slip__corner bw-slip__corner--tl" />
        <span className="bw-slip__corner bw-slip__corner--tr" />
        <span className="bw-slip__text">{text}</span>
      </div>
    </div>
  );
}
