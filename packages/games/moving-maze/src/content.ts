export const INTRO_CARDS: Record<number, string> = {
  1: 'اسحب النقطة المضيئة للمخرج الأخضر! انتبه للجدران اللي تتبدل كل بضع ثوانٍ.',
  5: 'متاهة أكبر وتبديل أسرع! خطط لمسارك قبل ما يتسكر الجدار.',
  8: 'احذر الفخاخ الحمراء! لمسها يرجعك لنقطة البداية فوراً ويضيع خطواتك.',
  14: 'الجدران صارت تتبدل فجأة بدون وميض تنبيه مسبق! ركّز في المسارات البديلة.',
  21: 'متاهة 10×10 واسعة! حافظ على خطواتك واقترب من المخرج بذكاء.',
  26: 'انطفى النور! تشوف 3 خانات حواليك بس، اعتمد على ذاكرتك المكانية.',
  46: 'اجمع المفاتيح بالترتيب (1 ثم 2) في الظلام قبل أن تنفتح بوابة المخرج!'
};

export const TAUNTS_LOW = [
  'المخرج قدامك وبدل ما تمشيله قعدت تلف في الدائرة؟ ركّز يا غالي 😏',
  'الجدار تسكّر في وجهك؟ اسحب بسرعة قبل ما تتبدل الخريطة!',
  '{score} نقطة تسخينة خفيفة بس 🧭 خطط لطريقك وعاود توّا!'
];

export const TAUNTS_MID = [
  'الفخ الأحمر رجعك للبداية مرتين؟ انتبه لخطواتك وما تتسرعش 👀',
  'لما الجدران بدت تتبدل بدون تنبيه ضيعت الطريق، زيدها محاولة وتضبط!',
  '{score} نقطة! خلصوا خطواتك على بعد خطوة وحدة من الباب 😈',
  'ملاحتك كويسة، بس تبي شوية سرعة في السحب باش توفر خطوات أكثر!'
];

export const TAUNTS_HIGH = [
  'رادار بشري ما شاء الله! تمشي في الظلام وتجمع المفاتيح بالترتيب 🔥',
  'متاهة 11×11 في الظلام ما يطلع منها إلا واحد ذكي زيك.. عاودها وتخش التوب!',
  '{score} نقطة! أداء خرافي، غلطة وحدة في الفخ وقفتك، مستحيل توقف هنا 😎'
];

export const LIVE_MESSAGES = [
  'يا سلام على التوفير! بونص خطوات في الجيب 🧭',
  'أوباا! فخ رجعك للبداية، اسحب بسرعة 🔙',
  'انطفى النور! اعتمد على ذاكرتك في الظلام 🔦',
  'فتحت الباب! اجمع المفتاح بالترتيب الصحيح 🔑',
  'آخر قلب! وفر خطواتك للمخرج 💔'
];

export const movingMazeContent = {
  title: 'متاهة تتحرك',
  titleEn: 'Moving Maze',
  howToPlay:
    'حرّك النقطة المضيئة من نقطة البداية إلى المخرج بأقل خطوات، وانتبه للجدران المتبدلة والفخاخ والظلام ومفاتيح البوابة بالترتيب!',
  introCards: INTRO_CARDS,
  tauntsLow: TAUNTS_LOW,
  tauntsMid: TAUNTS_MID,
  tauntsHigh: TAUNTS_HIGH,
  live: LIVE_MESSAGES,
  getTaunt
};

let lastTauntIndex = -1;

export function getTaunt(score: number, stage: number): string {
  let pool = TAUNTS_LOW;
  if (stage >= 26) {
    pool = TAUNTS_HIGH;
  } else if (stage >= 8) {
    pool = TAUNTS_MID;
  }

  let chosenIndex = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && chosenIndex === lastTauntIndex) {
    chosenIndex = (chosenIndex + 1) % pool.length;
  }
  lastTauntIndex = chosenIndex;

  const template = pool[chosenIndex]!;
  return template
    .replace('{score}', score.toLocaleString('en-US'))
    .replace('{stage}', stage.toString());
}
