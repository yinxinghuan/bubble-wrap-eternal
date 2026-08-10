// Lightweight detail modal for a single fortune slip. There was no detail
// view before — tapping a wall slip opens this: the fortune text, who wrote
// it, and a public guestbook thread (notes ∪ my own, oldest-first) with a
// compose box. Best-effort cross-user display + author ping (@shared/social).
// Close on backdrop tap or the × button.

import { useState } from 'react';
import './SlipDetail.less';
import type { Fortune, WallFortune } from '../types';
import { timeAgo, type GuestMessage } from '@shared/social/guestbook';
import { openAigramProfile, isInAigramNow } from '@shared/runtime';
import { t, locale } from '../i18n';

const ALTERU_APP_URL = 'https://apps.apple.com/app/id6769646546';

export type SlipDetailProps = {
  fortune: Fortune | WallFortune;
  /** Notes on this fortune (wall ∪ my own, oldest-first). */
  thread: GuestMessage[];
  selfUserId?: string;
  onSend: (text: string) => void;
  onClose: () => void;
};

export default function SlipDetail({ fortune, thread, selfUserId, onSend, onClose }: SlipDetailProps) {
  const author = 'userId' in fortune ? (fortune as WallFortune) : null;
  const isSelf = !author || author.userId === selfUserId;

  return (
    <div className="bw-slip" onClick={onClose}>
      <div className="bw-slip__card" onClick={e => e.stopPropagation()}>
        <button className="bw-slip__close" onClick={onClose} aria-label={t('sheet.close')}>×</button>

        <div className="bw-slip__paper">
          <span className="bw-slip__text">{fortune.text}</span>
        </div>

        <div className="bw-slip__byline">
          {author && !isSelf ? (
            <button
              type="button"
              className="bw-slip__author"
              onClick={() => isInAigramNow() && openAigramProfile(author.userId)}
              disabled={!isInAigramNow()}
            >
              {author.userAvatarUrl ? (
                <img className="bw-slip__avatar" src={author.userAvatarUrl} alt="" draggable={false} />
              ) : (
                <span className="bw-slip__avatar bw-slip__avatar--letter">
                  {(author.userName || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="bw-slip__name">{author.userName}</span>
            </button>
          ) : (
            <span className="bw-slip__name bw-slip__name--self">{t('wall.you')}</span>
          )}
        </div>

        <div className="bw-notes">
          <div className="bw-notes__eyebrow">
            {t('notes.title')}{thread.length > 0 ? ` · ${thread.length}` : ''}
          </div>
          {thread.length > 0 ? (
            <ul className="bw-notes__list">
              {thread.map(m => (
                <NoteRow key={m.id} msg={m} selfUserId={selfUserId} />
              ))}
            </ul>
          ) : (
            <div className="bw-notes__empty">{t('notes.empty')}</div>
          )}
          {isInAigramNow() ? (
            <Compose onSend={onSend} />
          ) : (
            <div className="bw-notes__empty bw-notes__download">
              <span>{t('notes.signedout')}</span>
              <a href={ALTERU_APP_URL} target="_blank" rel="noopener noreferrer">
                {t('notes.download')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// One note: author chip (tappable → profile; self shows "you"), text, time.
function NoteRow({ msg, selfUserId }: { msg: GuestMessage; selfUserId?: string }) {
  const mine = !!msg.fromUserId && msg.fromUserId === selfUserId;
  const name = mine ? t('wall.you') : (msg.userName || 'someone');
  const initial = (msg.userName || '?').slice(0, 1).toUpperCase();
  const tappable = !mine && !!msg.fromUserId && isInAigramNow();
  const head = (
    <span className="bw-note__head">
      {msg.userAvatarUrl ? (
        <img className="bw-note__avatar" src={msg.userAvatarUrl} alt="" draggable={false} />
      ) : (
        <span className="bw-note__avatar bw-note__avatar--letter">{initial}</span>
      )}
      <span className={`bw-note__name${mine ? ' bw-note__name--self' : ''}`}>{name}</span>
      <span className="bw-note__time">{timeAgo(msg.ts, locale())}</span>
    </span>
  );
  return (
    <li className="bw-note">
      {tappable ? (
        <button
          type="button"
          className="bw-note__chip"
          onClick={e => { e.stopPropagation(); openAigramProfile(msg.fromUserId!); }}
        >
          {head}
        </button>
      ) : head}
      <p className="bw-note__text">{msg.text}</p>
    </li>
  );
}

// Compose box — controlled input + send; clicks don't bubble to the backdrop.
function Compose({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText('');
  };
  return (
    <div className="bw-compose" onClick={e => e.stopPropagation()}>
      <input
        className="bw-compose__input"
        value={text}
        maxLength={140}
        placeholder={t('notes.placeholder')}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
      />
      <button
        className="bw-compose__send"
        disabled={!text.trim()}
        onClick={submit}
      >
        {t('notes.send')}
      </button>
    </div>
  );
}
