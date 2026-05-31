// Bubble Wrap, Eternal — every Nth pop drops an AI fortune slip; platform
// tracks today's total pops across all players.

import { useCallback, useEffect, useRef, useState } from 'react';
import './Bubbles.less';
import BubbleGrid from './components/BubbleGrid';
import Pocket from './components/Pocket';
import Wall from './components/Wall';
import SlipOverlay from './components/SlipOverlay';
import { useBubbles } from './hooks/useBubbles';
import { useFortunes } from './hooks/useFortunes';
import { useStatsPing } from './hooks/useStatsPing';
import { useWall } from './hooks/useWall';
import {
  initAudio,
  installGlobalTapFeedback,
  isMuted,
  setMuted,
  playPop,
  playFortuneChime,
  hapticTap,
} from './utils/audio';
import { t } from './i18n';

const FORTUNE_CADENCE = 8;

export default function Bubbles() {
  const playRef = useRef<HTMLDivElement>(null);
  const { bubbles, cols, rows, pop } = useBubbles(playRef);
  const [hintVisible, setHintVisible] = useState(true);
  const [muted, setMutedState] = useState(isMuted());
  const [overlay, setOverlay] = useState<{ id: string; text: string; x: number; y: number } | null>(null);

  const { ping, stats } = useStatsPing();
  const { onPop: onPopFortune, fortunes, status, popsUntilNext } = useFortunes(
    FORTUNE_CADENCE,
    (f) => {
      // chime + place overlay at last pop coordinates (cached on window)
      playFortuneChime();
      const last = (window as any).__bw_lastPop as { x: number; y: number } | undefined;
      const x = last?.x ?? window.innerWidth / 2;
      const y = last?.y ?? window.innerHeight / 2;
      setOverlay({ id: f.id, text: f.text, x, y });
    },
  );
  const wall = useWall(fortunes);
  const [wallOpen, setWallOpen] = useState(false);

  useEffect(() => { installGlobalTapFeedback(); }, []);

  const handlePop = useCallback((id: string, x: number, y: number) => {
    if (hintVisible) setHintVisible(false);
    initAudio();
    pop(id);
    playPop();
    hapticTap();
    ping();
    (window as any).__bw_lastPop = { x, y };
    onPopFortune();
  }, [hintVisible, pop, ping, onPopFortune]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }, [muted]);

  const openWall = useCallback(() => {
    setWallOpen(true);
    wall.refresh();
  }, [wall]);

  const todayN = stats.day_click_count;

  return (
    <div className="bw-root">
      <header className="bw-header">
        <div className="bw-header__brand">
          <span className="bw-header__dot" />
          <span className="bw-header__name">{t('app.name')}</span>
        </div>
        <div className="bw-header__actions">
          <button
            className={`bw-iconbtn ${muted ? 'is-off' : ''}`}
            onClick={toggleMute}
            aria-label={muted ? t('mute.off') : t('mute.on')}
          >
            {muted ? '✕' : '♪'}
          </button>
          <button className="bw-iconbtn" onClick={openWall} aria-label="wall">⌘</button>
        </div>
      </header>

      <div className="bw-today">
        {todayN > 0 ? t('stats.today', { n: todayN.toLocaleString() }) : t('stats.today_loading')}
      </div>

      <div className="bw-play" ref={playRef}>
        <BubbleGrid bubbles={bubbles} cols={cols} rows={rows} onPop={handlePop} />
        {hintVisible && (
          <div className="bw-hint" role="status" aria-live="polite">{t('hint.tap')}</div>
        )}
      </div>

      <Pocket
        fortunes={fortunes}
        popsUntilNext={popsUntilNext}
        loading={status.phase === 'loading'}
        onOpenWall={openWall}
      />

      {overlay && (
        <SlipOverlay
          text={overlay.text}
          startX={overlay.x}
          startY={overlay.y}
          onDone={() => setOverlay(null)}
        />
      )}

      <Wall
        open={wallOpen}
        onClose={() => setWallOpen(false)}
        entries={wall.entries}
        mine={fortunes}
      />
    </div>
  );
}
