// Bottom strip showing the player's collected fortune slips. Each slip is a
// little folded card; the most recent floats up just above the strip.

import './Pocket.less';
import type { Fortune } from '../types';
import { t } from '../i18n';

export type PocketProps = {
  fortunes: Fortune[];
  popsUntilNext: number;
  loading: boolean;
  onOpenWall: () => void;
};

export default function Pocket({ fortunes, popsUntilNext, loading, onOpenWall }: PocketProps) {
  const empty = fortunes.length === 0;

  return (
    <div className="bw-pocket">
      <div className="bw-pocket__meta">
        <span className="bw-pocket__label">{t('pocket.label')}</span>
        <span className="bw-pocket__count">{fortunes.length}</span>
        <span className="bw-pocket__hint">
          {loading
            ? t('fortune.loading')
            : empty
              ? t('pocket.empty', { n: popsUntilNext })
              : t('pocket.next', { n: popsUntilNext })}
        </span>
      </div>
      <button className="bw-pocket__strip" onClick={onOpenWall} aria-label="open wall">
        {empty ? (
          <div className="bw-pocket__placeholder" />
        ) : (
          fortunes.slice(0, 6).map((f, i) => (
            <div
              key={f.id}
              className="bw-pocket__slip"
              style={{
                '--i': i,
                '--rot': `${(i % 2 === 0 ? -1 : 1) * (3 + i * 0.5)}deg`,
              } as React.CSSProperties}
            >
              <span>{f.text}</span>
            </div>
          ))
        )}
      </button>
    </div>
  );
}
