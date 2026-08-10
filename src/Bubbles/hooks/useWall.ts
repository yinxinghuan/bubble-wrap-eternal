// Cross-user fortunes wall + guestbook. Each player publishes their last few
// fortunes via useGameSave; this hook fetches everyone's latest payloads via
// get/data/list and flattens to newest-first across authors. The SAME fetch
// also aggregates public guestbook notes left on fortunes (best-effort,
// see @shared/social/guestbook) and folds note authors into the profile map.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  callAigramAPI,
  isInAigramNow,
  getTelegramId,
  type AigramResponse,
} from '@shared/runtime';
import { getGameUuid } from '@shared/runtime';
import { useGameEvent } from '@shared/runtime';
import { useGameSave } from '@shared/save';
import {
  appendMessage,
  guestbookNotifyConfig,
  messagesByTarget,
  newMessage,
  type GuestMessage,
} from '@shared/social/guestbook';
import type { Fortune, WallFortune, BubbleSave } from '../types';

const GAME_ID = 'bubble-wrap-eternal';
const PUBLISH_CAP = 6;        // we expose only the last few per user
const WALL_CAP = 24;
const NOTE_EVENT = 'bubble_note';

interface RawRow {
  user_id: string;
  user_name?: string;
  user_avatar_url?: string;
  head_url?: string;
  resource_data: string;
}

/**
 * Publishes the player's most recent N fortunes whenever the local list
 * changes (without wiping their guestbook notes), reads other users'
 * published fortunes + notes from the platform, and lets the player leave
 * a note on any fortune.
 */
export function useWall(mineFortunes: Fortune[]) {
  const save = useGameSave<BubbleSave>(GAME_ID);
  const events = useGameEvent();
  const [entries, setEntries] = useState<WallFortune[]>([]);
  const [messagesByFortune, setMessagesByFortune] = useState<Map<string, GuestMessage[]>>(new Map());
  const [loaded, setLoaded] = useState(false);

  // Local save mirror — source of truth for what we publish. Seeded ONCE from
  // the cloud/local save (useGameSave.savedData doesn't echo writes back), then
  // carries BOTH fortunes and our outgoing notes so neither publish wipes the
  // other (useGameSave-mirror skill).
  const [mirror, setMirror] = useState<BubbleSave>({ fortunes: [], messages: [] });
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    if (save.savedData === undefined) return; // still loading
    seeded.current = true;
    const init = save.savedData ?? { fortunes: [], messages: [] };
    setMirror({ fortunes: init.fortunes ?? [], messages: init.messages ?? [] });
  }, [save.savedData]);

  // Publish on local fortune change (debounced via useGameSave.persist).
  // Read-modify-write through the mirror so `messages` survives.
  useEffect(() => {
    if (mineFortunes.length === 0) return;
    setMirror(prev => {
      const next: BubbleSave = { ...prev, fortunes: mineFortunes.slice(0, PUBLISH_CAP) };
      save.persist(next);
      return next;
    });
  }, [mineFortunes, save]);

  const refresh = useCallback(async () => {
    const sessionId = getGameUuid();
    if (!isInAigramNow() || !sessionId) {
      setLoaded(true);
      return;
    }
    try {
      const res = await callAigramAPI<AigramResponse<RawRow[]>>(
        `/note/aigram/ai/game/get/data/list?session_id=${encodeURIComponent(sessionId)}`,
        'GET',
      );
      const rows: RawRow[] = Array.isArray(res?.data) ? res.data : [];

      // Wall fortunes (newest-first across other authors).
      const flat: WallFortune[] = [];
      const nameById = new Map<string, { name?: string; avatar?: string }>();
      for (const r of rows) {
        if (!r.resource_data) continue;
        if (r.user_id) {
          nameById.set(r.user_id, {
            name: r.user_name,
            avatar: r.head_url || r.user_avatar_url || undefined,
          });
        }
        if (r.user_id === getTelegramId()!) continue; // self renders from local
        let payload: BubbleSave;
        try { payload = JSON.parse(r.resource_data) as BubbleSave; }
        catch (_) { continue; }
        const list = Array.isArray(payload.fortunes) ? payload.fortunes : [];
        for (const f of list) {
          if (!f?.text || !f?.ts) continue;
          flat.push({
            ...f,
            userId: r.user_id,
            userName: r.user_name || 'someone',
            userAvatarUrl: r.head_url || r.user_avatar_url || undefined,
          });
        }
      }
      flat.sort((a, b) => b.ts - a.ts);
      setEntries(flat.slice(0, WALL_CAP));

      // Guestbook notes left on fortunes — same read window. Stamp each note's
      // author with the profile we already have from the row map (note authors
      // are themselves players in this list).
      const byTarget = messagesByTarget(rows);
      const stamped = new Map<string, GuestMessage[]>();
      for (const [target, msgs] of byTarget) {
        stamped.set(
          target,
          msgs.map(m => {
            const p = m.fromUserId ? nameById.get(m.fromUserId) : undefined;
            return { ...m, userName: p?.name, userAvatarUrl: p?.avatar };
          }),
        );
      }
      setMessagesByFortune(stamped);
    } catch (_) {
      // keep stale
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Leave a note on a fortune: store it in MY own blob (the wall aggregates
  // everyone's) and ping the author once per target per session. Skip self.
  const noteNotified = useRef<Set<string>>(new Set());
  const sendMessage = useCallback((fortune: Fortune | WallFortune, text: string) => {
    const authorId = 'userId' in fortune ? (fortune as WallFortune).userId : getTelegramId()! || undefined;
    const msg = newMessage(fortune.id, authorId, text);
    if (!msg) return;
    setMirror(prev => {
      const next = appendMessage(prev, msg);
      save.persist(next);
      return next;
    });

    const selfId = getTelegramId()! || 'self';
    if (authorId && authorId !== selfId && !noteNotified.current.has(fortune.id)) {
      noteNotified.current.add(fortune.id);
      events.trigger(
        NOTE_EVENT,
        guestbookNotifyConfig({
          toUserId: authorId,
          note: text,
          template: '{sender_name} left a note on your fortune',
        }),
      );
    }
    setTimeout(() => refresh(), 1500);
  }, [save, events, refresh]);

  const myMessages = useMemo(() => mirror.messages ?? [], [mirror.messages]);

  return {
    entries,
    loaded,
    refresh,
    messagesByTarget: messagesByFortune,
    myMessages,
    sendMessage,
  };
}
