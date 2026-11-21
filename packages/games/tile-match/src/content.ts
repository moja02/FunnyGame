export const TILE_ICONS: string[] = [
  '🍓', // 0: Strawberry
  '🍌', // 1: Banana
  '🍎', // 2: Apple
  '🍇', // 3: Grape
  '🍊', // 4: Orange
  '🍉', // 5: Watermelon
  '🥑', // 6: Avocado
  '🍒', // 7: Cherry
  '🍍', // 8: Pineapple
  '🥝', // 9: Kiwi
  '🥥', // 10: Coconut
  '🥕', // 11: Carrot
  '🌽', // 12: Corn
  '🥦', // 13: Broccoli
  '🍕', // 14: Pizza
  '🍔'  // 15: Burger
];

export const INTRO_CARDS: Record<number, string> = {
  1: 'طابق 3 بطاقات متطابقة في الشريط السفلي لتفريغها ومسح اللوحة بالكامل! 🍓',
  5: 'مرحلة زعيم! طبقات كثيفة ومتداخلة جداً، خطط جيداً قبل النقل للشريط 🔥',
  6: 'مرحلة استراحة وتنفس! جولة خفيفة وسريعة مع وقت إضافي ☕',
  7: 'احذر! ظهرت بطاقات غامضة (؟) لا تنكشف فاكهتها إلا بعد وصولها للشريط ❓',
  15: 'شريط ضيق! المساحة أصبحت 6 خانات فقط، ركّز في كل خطوة ⚠️',
  16: 'بطاقات متجمدة! حرر الجليد عنها بإتمام أي مطابقة ثلاثية في الشريط ❄️',
  26: 'تحدي الخبراء! بطاقات غامضة ومجمدة مع شريط تجميع ضيق ⚡',
  41: 'الزعيم الأسطوري! شريط التجميع 5 خانات فقط، لا مكان للخطأ 🏆'
};

export const TAUNTS_LOW: string[] = [
  'الشريط تعبى ع الآخر وإنت تفرج! ركّز في البطاقات اللي تحت قبل ما تسحب 😏',
  'زردة خضرة وفواكه عبيتها ع الفاضي! امسح دموعك وعاود الجولة 🍓',
  'الوقت طار والشريط معبّي! خفف يدك وسرّع عيونك ⏱️'
];

export const TAUNTS_MID: string[] = [
  'قريب تكملها! كان استخدمت أداة السحب راهو سلكت روحك 👀',
  'شكلك حطيت عينك على فاكهة وحدة ونسيت الباقي! التكتيك يبي وساعة بال 🤔',
  '{score} نقطة! قربت تفضي اللوحة، زيد ركّز في الطبقات السفلية!'
];

export const TAUNTS_HIGH: string[] = [
  'معلم في الفرز والمطابقة! شريط 5 خانات وطبقات عميقة ومسحتها كلها 🔥',
  '{score} نقطة! أداء أسطوري، تفكيك هندسي عبقري للطبقات 👑',
  'رؤية ثلاثية الأبعاد خرافية! وصلت للتوب وما وقفك إلا نفاذ الوقت 😎'
];

export const LIVE_MESSAGES: string[] = [
  'ثلاثية في السريع! معلم 🔥',
  'رد بالك! الشريط قَرّب يعبّى ⚠️',
  'فكّيت الجليد! واصل يا بطل ❄️',
  'كشفت البطاقة الغامضة! ❓✨',
  'آخر بطاقات في اللوحة! مسح كامل قريب 🍓'
];

export const TAUNTS: string[] = [
  ...TAUNTS_LOW,
  ...TAUNTS_MID,
  ...TAUNTS_HIGH
];

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

  const pool = score >= 5000 ? TAUNTS_HIGH : score >= 1500 ? TAUNTS_MID : TAUNTS_LOW;
  const idx = Math.abs(Math.round(score + stage * 7)) % pool.length;
  return pool[idx] ?? pool[0]!;
}

export const tileMatchContent = {
  title: 'مطابقة الطبقات',
  howToPlay: 'انقل البطاقات المكشوفة لشريط التجميع السفلي. عند اكتمال 3 بطاقات من نفس النوع تختفي وتفرّغ خانات. تجنب امتلاء الخانات بالكامل!',
  introCards: INTRO_CARDS,
  tauntsLow: TAUNTS_LOW,
  tauntsMid: TAUNTS_MID,
  tauntsHigh: TAUNTS_HIGH,
  live: LIVE_MESSAGES,
  getTaunt
};
