export const INTRO_CARDS: Record<number, string> = {
  1: 'اقرأ بتركيز! الجواب الأول اللي يخطر في بالك غالباً فخ مخفي 🧠',
  5: 'تخيّل المشهد صح ولا تتسرع في ترتيب المراكز والسباقات! 🏃‍♂️',
  7: 'انتبه للنسبة والتناسب، الفخ دايماً في الأرقام المتكررة! ⏱️',
  10: 'التضاعف يمشي بالعكس! فكّر في الخطوة السابقة فقط 🌊',
  15: 'واحد صادق دايماً وواحد كذاب دايماً، استنتج الحقيقة المنطقية! 🎭',
  21: 'احسب أسوأ احتمال ممكن في الظلام عشان تضمن النتيجة! 🧦',
  26: 'رتّب الأسماء واستبعد الاحتمالات الغلط خطوة بخطوة! 🧩',
  36: 'ثلاثة أشخاص وواحد بس صادق، جرب كل فرضية بهدوء! 👥',
  46: 'اربط كل شخص بصفته الصحيحة من الشروط المتقاطعة! 📋'
};

export const TAUNTS_LOW: string[] = [
  'وقعت في الفخ من أول نظرة! قلنالك اقرأ السؤال مرتين يا غالي 😏',
  'تجاوزت الثاني صرت الأول؟ تي ركّز شوية وعاود!',
  '{score} نقطة! الفخ صاده بصنارة، شغّل دماغك وعاود توّا!'
];

export const TAUNTS_MID: string[] = [
  'الكذاب ضحك عليك وصدقته؟ 😂 راجع كلامه زين وعاود!',
  'قريب تفك الشفرة، بس التسرع خلاك تختار الفخ الجاهز 👀',
  '{score} نقطة! منطقك كويس، ناقصك شوية هدوء في الأسئلة الطويلة 😈',
  'حسبتها صح في عقلك بس صبعك ضغط على الفخ! زيدها محاولة.'
];

export const TAUNTS_HIGH: string[] = [
  'محقق جنائي ما شاء الله! تفكك ألغاز الصادق والكاذب في ثواني 🔥',
  'عقلك يوزن بلد، ولا فخ قدر يطيّحك لين وصلت هنا.. عاودها وتخش التوب!',
  '{score} نقطة! أداء أسطوري، غلطة وحدة في الترتيب وقفتك، مستحيل تسيبها هكي 😎'
];

export const LIVE_MESSAGES: string[] = [
  'تجاوزت الفخ بذكاء! معلم منطق 🧠',
  'ما ينضحكش عليك! كومبو نار 🔥',
  'انتبه! السؤال هذا فيه فخ مخفي 👀',
  'طحت في الفخ! راح قلب 💔',
  'آخر قلب! اقرأ كل كلمة بتركيز ⚡'
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
  const template = pool[idx] ?? pool[0]!;
  return template.replace('{score}', score.toLocaleString('ar-LY'));
}

export const smartTrapContent = {
  title: 'الفخ الذكي',
  howToPlay: 'اقرأ اللغز المنطقي بعناية وتجنب خيار الفخ البديهي المتسرع. اختر الإجابة المنطقية الصحيحة قبل نفاد الوقت!',
  introCards: INTRO_CARDS,
  tauntsLow: TAUNTS_LOW,
  tauntsMid: TAUNTS_MID,
  tauntsHigh: TAUNTS_HIGH,
  live: LIVE_MESSAGES,
  getTaunt
};
