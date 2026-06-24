// Today's slips — full-screen overlay with two tabs (today / mine).

import { useState } from 'react';
import './Wall.less';
import type { Fortune, WallFortune } from '../types';
import { t } from '../i18n';
import { openAigramProfile, isInAigram } from '@shared/runtime';

type Tab = 'today' | 'mine';

export type WallProps = {
  open: boolean;
  onClose: () => void;
  entries: WallFortune[];
  mine: Fortune[];
  onOpenSlip: (fortune: Fortune | WallFortune) => void;
};

export default function Wall({ open, onClose, entries, mine, onOpenSlip }: WallProps) {
  const [tab, setTab] = useState<Tab>('today');
  if (!open) return null;
  const list = tab === 'today' ? entries : mine;

  return (
    <div className="bw-wall">
      <div className="bw-wall__bar">
        <div className="bw-wall__title">{t('wall.title')}</div>
        <button className="bw-wall__close" onClick={onClose} aria-label={t('sheet.close')}>×</button>
      </div>
      <div className="bw-wall__tabs">
        <button
          className={`bw-wall__tab ${tab === 'today' ? 'is-active' : ''}`}
          onClick={() => setTab('today')}
        >
          {t('wall.tab_today')}
        </button>
        <button
          className={`bw-wall__tab ${tab === 'mine' ? 'is-active' : ''}`}
          onClick={() => setTab('mine')}
        >
          {t('wall.tab_mine')} {mine.length ? `· ${mine.length}` : ''}
        </button>
      </div>
      <div className="bw-wall__scroll">
        {list.length === 0 ? (
          <div className="bw-wall__empty">{t('wall.empty')}</div>
        ) : (
          list.map((f, i) => {
            const isWall = tab === 'today';
            const author = isWall ? (f as WallFortune) : null;
            return (
              <div
                key={`${f.id}-${i}`}
                className="bw-wall__slip"
                style={{ '--rot': `${(i % 2 === 0 ? -1 : 1) * (1 + (i % 3) * 0.6)}deg` } as React.CSSProperties}
                onClick={() => onOpenSlip(f)}
              >
                <div className="bw-wall__paper">
                  <span className="bw-wall__text">{f.text}</span>
                </div>
                <div className="bw-wall__author">
                  {author ? (
                    <button
                      type="button"
                      className="bw-wall__chip"
                      onClick={(e) => { e.stopPropagation(); isInAigram && openAigramProfile(author.userId); }}
                    >
                      {author.userAvatarUrl ? (
                        <img className="bw-wall__avatar" src={author.userAvatarUrl} alt="" draggable={false} />
                      ) : (
                        <span className="bw-wall__avatar bw-wall__avatar--letter">
                          {(author.userName || '?').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="bw-wall__name">{author.userName}</span>
                    </button>
                  ) : (
                    <span className="bw-wall__chip bw-wall__chip--you">{t('wall.you')}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
