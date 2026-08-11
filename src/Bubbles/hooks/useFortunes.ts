// Pop counter + LLM call every Nth pop. Returns the current pocket (newest
// first) and a "next-drop in K pops" hint. Persists across reloads via
// localStorage so a flick-and-bounce doesn't reset progress.

import { useCallback, useRef, useState } from 'react';
import { useChat } from '@shared/runtime';
import { FORTUNE_SYSTEM, sanitizeFortune, userPromptForFortune } from '../utils/prompts';
import { locale } from '../i18n';
import type { Fortune } from '../types';

const LS_FORTUNES = 'bubble-eternal-fortunes';
const LS_COUNTER  = 'bubble-eternal-counter';
const POCKET_CAP  = 24;

function loadFortunes(): Fortune[] {
  try {
    const raw = alteruLocalStorage.getItem(LS_FORTUNES);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Fortune[];
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, POCKET_CAP);
  } catch (_) {
    return [];
  }
}

function loadCounter(): number {
  try {
    const raw = alteruLocalStorage.getItem(LS_COUNTER);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (_) {
    return 0;
  }
}

export type FortuneStatus =
  | { phase: 'idle' }
  | { phase: 'loading'; popIdx: number }
  | { phase: 'error'; popIdx: number; message: string };

export function useFortunes(cadence: number, onNewFortune?: (f: Fortune) => void) {
  const chat = useChat({ system: FORTUNE_SYSTEM, maxHistory: 0 });
  const [fortunes, setFortunes] = useState<Fortune[]>(() => loadFortunes());
  const [counter, setCounter] = useState<number>(() => loadCounter());
  const [status, setStatus] = useState<FortuneStatus>({ phase: 'idle' });
  const inFlightRef = useRef(false);

  const persistFortunes = (next: Fortune[]) => {
    setFortunes(next);
    try { alteruLocalStorage.setItem(LS_FORTUNES, JSON.stringify(next)); } catch (_) {}
  };
  const persistCounter = (next: number) => {
    setCounter(next);
    try { alteruLocalStorage.setItem(LS_COUNTER, String(next)); } catch (_) {}
  };

  const onPop = useCallback(async () => {
    const next = counter + 1;
    persistCounter(next);
    if (next % cadence !== 0) return;        // not yet a fortune pop
    if (inFlightRef.current) return;         // skip the rare overlap
    inFlightRef.current = true;
    setStatus({ phase: 'loading', popIdx: next });
    try {
      const raw = await chat.send(userPromptForFortune(next, locale()));
      const text = sanitizeFortune(raw);
      if (!text) throw new Error('empty fortune');
      const f: Fortune = { id: `${Date.now().toString(36)}-${next}`, text, ts: Date.now() };
      const merged = [f, ...fortunes].slice(0, POCKET_CAP);
      persistFortunes(merged);
      setStatus({ phase: 'idle' });
      onNewFortune?.(f);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus({ phase: 'error', popIdx: next, message: msg });
    } finally {
      inFlightRef.current = false;
    }
  }, [counter, cadence, chat, fortunes, onNewFortune]);

  const popsUntilNext = cadence - (counter % cadence);

  return { onPop, fortunes, counter, status, popsUntilNext };
}
