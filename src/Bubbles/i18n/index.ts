type Locale = 'en' | 'zh';

const STR: Record<Locale, Record<string, string>> = {
  en: {
    'app.name': 'BUBBLE WRAP, ETERNAL',
    'hint.tap': 'tap a bubble',
    'stats.today': 'today the world has popped {n}',
    'stats.today_loading': 'today the world is popping…',
    'pocket.label': 'your pocket',
    'pocket.empty': 'pop {n} more for a slip',
    'pocket.next': 'pop {n} more for the next slip',
    'fortune.loading': 'reading the slip…',
    'fortune.error': 'the slip was blank · try again',
    'wall.title': "today's slips",
    'wall.empty': 'no slips yet today · pop something',
    'wall.tab_today': 'today',
    'wall.tab_mine': 'mine',
    'wall.you': 'YOU',
    'notes.title': 'notes',
    'notes.empty': 'no notes yet · be the first',
    'notes.signedout': 'open in AlterU to leave a note',
    'notes.download': 'Get AlterU on the App Store',
    'notes.placeholder': 'leave a note…',
    'notes.send': 'send',
    'mute.on': 'sound',
    'mute.off': 'muted',
    'sheet.close': 'close',
  },
  zh: {
    'app.name': '气泡膜 · 永',
    'hint.tap': '戳一颗',
    'stats.today': '今天全世界已经戳了 {n} 颗',
    'stats.today_loading': '今天全世界正在戳…',
    'pocket.label': '你的口袋',
    'pocket.empty': '再戳 {n} 颗掉出第一张',
    'pocket.next': '再戳 {n} 颗掉下一张',
    'fortune.loading': '正在念这张纸条…',
    'fortune.error': '纸条是空的 · 再试一次',
    'wall.title': '今日的纸条',
    'wall.empty': '今天还没有纸条 · 去戳一颗',
    'wall.tab_today': '今日',
    'wall.tab_mine': '我的',
    'wall.you': '你',
    'notes.title': '留言',
    'notes.empty': '还没有留言 · 来抢第一条',
    'notes.signedout': '在 AlterU 里打开即可留言',
    'notes.download': '下载 AlterU',
    'notes.placeholder': '写句留言…',
    'notes.send': '发送',
    'mute.on': '有声',
    'mute.off': '静音',
    'sheet.close': '关闭',
  },
};

function detectLocale(): Locale {
  try {
    const o = alteruLocalStorage.getItem('bubble_eternal_locale');
    if (o === 'en' || o === 'zh') return o;
  } catch (_) {}
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

let LOCALE: Locale = detectLocale();
export function locale(): Locale { return LOCALE; }
export function t(key: string, vars?: { n?: number | string }): string {
  let s = STR[LOCALE][key];
  if (!s) return key;
  if (vars?.n != null) s = s.replace('{n}', String(vars.n));
  return s;
}
