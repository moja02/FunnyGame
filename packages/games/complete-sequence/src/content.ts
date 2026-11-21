export interface TauntContext {
  stage: number;
  score: number;
}

export const TAUNTS_LOW = [
  '2, 4, 6, 8 وما عرفتش اللي بعدها؟ شكلك نعسان يا غالي 😏 عاود!',
  'النمط واضح زي الشمس، لا تتسرع واحسب الفرق بين أول رقمين.',
  '{score} نقطة تسخينة خفيفة بس 🧠 شغّل التروس وعاود توّا!'
];

export const TAUNTS_MID = [
  'لما حطينا الخانة الفارغة في النص دخت شوية! اربط اللي قبلها باللي بعدها.',
  'متتالية الأشكال تبي عين تراقب الدوران واللون مع بعض 👀 زيدها محاولة!',
  '{score} نقطة! قريب توصل لمرحلة العباقرة، غلطة وحدة وقفتك 😈',
  'قاعدتين مخلوطتين لخبطوك شوية؟ مرة زيادة وتلقط الإيقاع!'
];

export const TAUNTS_HIGH = [
  'دماغك شطرنج ما شاء الله! فيبوناتشي ومربعات وتجيبهم؟ 🔥',
  'المتتاليتين المتداخلتين يبوا تركيز خارق وإنت قدها، مرة زيادة وتخش التوب!',
  '{score} نقطة! أداء أسطوري، قليل اللي يوصل لهالعمق المنطقي 😎'
];

export const LIVE_MESSAGES = [
  'لقطت القاعدة المركبة! بونص ×1.5 🧠',
  'ذكاء خارق! كومبو ×3 مولّع 🔥',
  'انتبه! الخانة الناقصة صارت في النص 👀',
  'مش هذا النمط! راح قلب 💔',
  'آخر قلب! تأكد من القاعدة قبل ما تضغط ⚡'
];

export const INTRO_CARDS: Record<number, string> = {
  1: 'اكتشف القاعدة وكمل الرقم الناقص!',
  5: 'المرة هذي قاعدتين يتناوبوا ورا بعض!',
  10: 'متتالية أشكال! راقب الدوران وتبدل الألوان.',
  15: 'الخانة الناقصة صارت في النص، اربط الطرفين!',
  20: 'المتتالية ممكن تنزل تحت الصفر للسالب!',
  26: 'قواعد مركبة: مربعات أو فيبوناتشي!',
  36: 'انتبه للأعداد الأولية والأنماط المركبة!',
  46: 'متتاليتين داخل بعض! وحدة للأماكن الفردية ووحدة للزوجية.',
  56: 'أرقام وأشكال متداخلة في نفس السلسلة!'
};

export function getTaunt(scoreOrObj: number | { score?: number; stage?: number }, _stageParam?: number): string {
  let stage = 1;
  let score = 0;
  if (typeof scoreOrObj === 'object' && scoreOrObj !== null) {
    score = scoreOrObj.score ?? 0;
    stage = scoreOrObj.stage ?? 1;
  } else {
    score = typeof scoreOrObj === 'number' ? scoreOrObj : 0;
    stage = typeof _stageParam === 'number' ? _stageParam : 1;
  }

  const pool = stage >= 26 ? TAUNTS_HIGH : stage >= 8 ? TAUNTS_MID : TAUNTS_LOW;
  const idx = Math.abs(Math.round(score + stage * 7)) % pool.length;
  const template = pool[idx] ?? pool[0]!;
  return template.replace('{score}', score.toLocaleString('ar-LY'));
}

export const completeSequenceContent = {
  title: 'أكمل المتتالية',
  howToPlay: 'اكتشف القاعدة المنطقية بين العناصر (أرقام أو أشكال) واختر العنصر المكمل الناقص قبل نفاد الوقت!',
  introCards: INTRO_CARDS,
  tauntsLow: TAUNTS_LOW,
  tauntsMid: TAUNTS_MID,
  tauntsHigh: TAUNTS_HIGH,
  live: LIVE_MESSAGES,
  getTaunt
};
