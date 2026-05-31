// Cross-user fortunes wall. Each player publishes their last few fortunes
// via useGameSave; this hook fetches everyone's latest payloads via
// get/data/list and flattens to newest-first across authors.

import { useCallback, useEffect, useState } from 'react';
import {
  callAigramAPI,
  isInAigram,
  telegramId,
  type AigramResponse,
} from '@shared/runtime';
import { getGameUuid } from '@shared/runtime';
import { useGameSave } from '@shared/save';
import type { Fortune, WallFortune } from '../types';

const GAME_ID = 'bubble-wrap-eternal';
const PUBLISH_CAP = 6;        // we expose only the last few per user
const WALL_CAP = 24;

interface RawRow {
  user_id: string;
  user_name?: string;
  user_avatar_url?: string;
  head_url?: string;
  resource_data: string;
}

type SavePayload = { fortunes: Fortune[] };

/**
 * Publishes the player's most recent N fortunes whenever the local list
 * changes, and reads other users' published fortunes from the platform.
 */
export function useWall(mineFortunes: Fortune[]) {
  const save = useGameSave<SavePayload>(GAME_ID);
  const [entries, setEntries] = useState<WallFortune[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Publish on local change (debounced via useGameSave.persist).
  useEffect(() => {
    if (mineFortunes.length === 0) return;
    save.persist({ fortunes: mineFortunes.slice(0, PUBLISH_CAP) });
  }, [mineFortunes, save]);

  const refresh = useCallback(async () => {
    const sessionId = getGameUuid();
    if (!isInAigram || !sessionId) {
      setLoaded(true);
      return;
    }
    try {
      const res = await callAigramAPI<AigramResponse<RawRow[]>>(
        `/note/aigram/ai/game/get/data/list?session_id=${encodeURIComponent(sessionId)}`,
        'GET',
      );
      const rows: RawRow[] = Array.isArray(res?.data) ? res.data : [];
      const flat: WallFortune[] = [];
      for (const r of rows) {
        if (!r.resource_data) continue;
        if (r.user_id === telegramId) continue; // self renders from local
        let payload: SavePayload;
        try { payload = JSON.parse(r.resource_data) as SavePayload; }
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
    } catch (_) {
      // keep stale
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { entries, loaded, refresh };
}
