export const INTRO_CARDS: Record<number, string> = {
  10: 'الناتج السابق يكمل معاك: العملية الجديدة عليه.',
  26: 'سلسلة: عمليتين ورا بعض على الناتج السابق.',
  28: 'عمليتين: اختار الناتج الأكبر.',
  46: 'الناتج السابق يختفي. احفظه وكمّل عليه في راسك.'
};

export const calcPressureContent = {
  title: 'حاسبة تحت الضغط',
  tauntsLow: [
    'المرحلة {stage} بس؟ حتى الحاسبة اللي في جيبك تضحك عليك 😏 عاود!',
    'الأرقام ما غلبوك، إنت اللي استعجلت. عاود توّا!',
    '{score} نقطة تكفي للتسخين بس 🔢 مرة زيادة؟'
  ],
  tauntsMid: [
    'المرحلة {stage}! مليح، بس عقلك سخن وتلخبط في الآخر. عاود!',
    '{score} نقطة. خوك يقدر يعديها؟ ورّيه 😉',
    'غلطة وحدة وطار الكومبو. الأرقام ما ترحم 😈',
    'كنت ماشي مليح... وين راح الحساب؟ مرة زيادة!'
  ],
  tauntsHigh: [
    'المرحلة {stage}؟! ياسر مليح. بس القمة أبعد من هكا 😏',
    'توّا صرت من القلة. تبي تثبت إنها مش صدفة؟',
    'عقلك حاسبة بصراحة، بس الوقت كسبك هالمرة. ارجع له!'
  ],
  live: [
    'استعجلت! الأرقام تستنى، ما تهرب 👀',
    'كومبو ×2! لا تنكسر 🔥',
    'كومبو ×3! حاسبة بشرية 😎',
    'قلب واحد باقي... احسبها مليح 💔',
    'زعيم! الأرقام كلها مع بعضها 😈'
  ],
  howToPlay: 'احسب العملية المعروضة واضغط على الناتج الصحيح من الخيارات الثلاثة قبل نفاد الوقت. مع تقدم المراحل تتراكم العمليات وتتسلسل وتختفي في الذاكرة!'
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

  const index = Math.floor(Math.random() * pool.length);
  const template = pool[index] || pool[0]!;

  return template
    .replace('{stage}', String(stage))
    .replace('{score}', formattedScore);
}
