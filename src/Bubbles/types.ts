export type Bubble = {
  id: string;          // stable per-cell; lets refill keep React keys
  row: number;
  col: number;
  jitterX: number;     // -1..1 — tiny offset for organic feel
  jitterY: number;
  size: number;        // 0..1 — scales base size
  hue: number;         // 0..360 — narrow band for plastic-sheet variation
  popped: boolean;
  poppedAt: number;    // ms — for refill cooldown
};

export type Fortune = {
  id: string;
  text: string;
  ts: number;
};

export type WallFortune = Fortune & {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
};
