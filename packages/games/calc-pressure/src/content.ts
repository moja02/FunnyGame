export const INTRO_CARDS: Record<number, string> = {
  10: 'الناتج السابق يكمل معاك: العملية الجديدة عليه.',
  26: 'سلسلة: عمليتين ورا بعض على الناتج السابق.',
  28: 'عمليتين: اختار الناتج الأكبر.',
  46: 'الناتج السابق يختفي. احفظه وكمّل عليه في راسك.'
};

let lastCalcPressureTauntIdx = -1;

export const calcPressureContent = {
  title: 'حاسبة تحت الضغط',
  tauntsLow: [
    'المرحلة {stage} بس؟ حتى الحاسبة اللي في جيبك تضحك عليك 😏 عاود!',
    'الأرقام ما غلبوك، إنت اللي استعجلت. عاود توّا! 🧮',
    '{score} نقطة تكفي للتسخين بس 🔢 مرة زيادة؟',
    'استعجلت في الحسبة وطار القلب؟ الهدوء نص الشطارة! 🧘‍♂️',
    '3 قلوب طاروا في أول كم خطوة؟ روق وعاود الجولة 🔥',
    'جمعت وطرحت في ثانية بس الخيار غلط! ركز قبل ما تنقر 👍',
    'بداية تسخين بس، ورّينا شطارتك في المحاولة الجاية! ⚡'
  ],
  tauntsMid: [
    'المرحلة {stage}! مليح، بس عقلك سخن وتلخبط في الآخر. عاود!',
    '{score} نقطة. خوك يقدر يعديها؟ ورّيه 😉',
    'غلطة وحدة وطار الكومبو. الأرقام ما ترحم 😈',
    'كنت ماشي مليح... وين راح الحساب؟ مرة زيادة!',
    'الناتج المحفوظ هرب من ذاكرتك؟ ركز في الرقم السابق كويس 🧠',
    'سلسلة العمليات هذي دارتلك دوخة؟ خود نفس وعاودها 🎯',
    'سكورك {score} في مرحلة {stage} ممتاز! محاولة تانية وتكسر الرقم 😎'
  ],
  tauntsHigh: [
    'المرحلة {stage}؟! ياسر مليح. بس القمة أبعد من هكا 😏',
    'توّا صرت من القلة. تبي تثبت إنها مش صدفة؟',
    'عقلك حاسبة بصراحة، بس الوقت كسبك هالمرة. ارجع له! 🔥',
    '{score} نقطة! رقم قياسي فخم، باقي خطوة وتخش التوب 👑',
    'العمليات تختفي وعقلك يحسب في الظلام! أداء أسطوري ⚡'
  ],
  live: [
    'استعجلت! الأرقام تستنى، ما تهرب 👀',
    'كومبو ×2! لا تنكسر 🔥',
    'كومبو ×3! حاسبة بشرية 😎',
    'قلب واحد باقي... احسبها مليح 💔',
    'زعيم! الأرقام كلها مع بعضها 😈'
  ],
  howToPlay: 'احسب العملية المعروضة واضغط على الناتج الصحيح من الخيارات الثلاثة قبل نفاد الوقت. مع تقدم المراحل تتراكم العمليات وتتسلسل وتختفي في الذاكرة!',
  getTaunt: (contextOrStage: any, maybeScore?: number): string => {
    let stage = 1;
    let score = 0;
    if (typeof contextOrStage === 'object' && contextOrStage !== null) {
      stage = contextOrStage.stage || 1;
      score = contextOrStage.score || 0;
    } else {
      stage = Number(contextOrStage) || 1;
      score = Number(maybeScore) || 0;
    }
    return getTaunt(stage, score);
  }
};

/**
 * Returns a tier-appropriate Libyan taunt with formatted stage and score
 */
export function getTaunt(stage: number, score: number): string {
  const formattedScore = score.toLocaleString('en-US');
  let pool = calcPressureContent.tauntsLow;

  if (stage >= 26) {
    pool = calcPressureContent.tauntsHigh;
  } else if (stage >= 8) {
    pool = calcPressureContent.tauntsMid;
  }

  // Prevent immediate repetition
  let pickIndex = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && pickIndex === lastCalcPressureTauntIdx) {
    pickIndex = (pickIndex + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  }
  lastCalcPressureTauntIdx = pickIndex;

  const template = pool[pickIndex] || pool[0]!;

  return template
    .replace(/\{stage\}/g, String(stage))
    .replace(/\{score\}/g, formattedScore);
}
