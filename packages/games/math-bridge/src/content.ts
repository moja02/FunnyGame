export const INTRO_CARDS: Record<number, string> = {
  1: 'اختر العملية اللي تخلي المعادلة صحيحة.',
  5: 'خانتين فارغتين! اختر الزوج الصحيح.',
  10: 'انتبه للأقواس وأولوية الضرب والقسمة!',
  15: 'هالمرة الرقم هو اللي ناقص، احسبه!',
  20: 'النواتج والأرقام ممكن تكون بالسالب!',
  26: 'ثلاث خانات ناقصة مع أسس، ركّز!',
  31: 'الجذور التربيعية دخلت المعادلة!',
  36: 'باقي القسمة (%) صار من العمليات المتاحة!',
  46: 'احسب X من المعادلة الأولى، وعوّض بيه في الثانية!',
  61: 'المعادلة الأولى تختفي بعد ثانية، احفظ قيمة X!'
};

let lastMathBridgeTauntIdx = -1;

export const mathBridgeContent = {
  title: 'الجسر الحسابي',
  tauntsLow: [
    '7 × 3 ما عرفتهاش؟ شكلك كنت تهرب من حصص الحساب يا بطل 😏',
    'ضربت بدل ما تجمع؟ طلع الآلة الحاسبة وعاود توّا! 🧮',
    '{score} نقطة تسخينة أول ابتدائي بس 🔢 عاود وورينا!',
    'تسرعت وضغطت الغلط؟ الحساب يبي هدوء مش رعشة يدين! ✋',
    'معادلة من خانة وحدة طيرتلك القلوب؟ عاود وركز في الإشارة!',
    'خيرها صوابعك تجري قبل عقلك؟ روق وعاود الجولة من جديد 😎',
    'جمعت 4 مع 9 ونسيت الضرب؟ جدول الضرب يسلم عليك بالواحد بالواحد 😂',
    'طاح الجسر من أول خطوة! وسع بالك وركب المعادلة صح 🌉',
    'الوقت ما زال فيه شوية وعقلك طفى؟ خودلك رشفة شاهي وعاود ☕'
  ],
  tauntsMid: [
    'لما طلعت الأقواس لخبطت الدنيا! الضرب قبل الجمع يا غالي 👀',
    'ماشي ممتاز لين جت الخانتين الفارغتين.. زيدها محاولة وتجيبها!',
    '{score} نقطة! غلطة وحدة في الإشارة طيّرت الكومبو 😈',
    'حسابك سريع ما شاء الله، بس التسرع خلاك تختار القسمة بدل الطرح!',
    'الأقواس دارتلك كمين؟ فك القوس أول وبعدين احسب الباقي 🎯',
    'الرقم المجهول طلعلك من تحت الأرض؟ فكر فيها بالعكس وتجيبها!',
    'الإشارات السالبة لعبت بيك! السالب في السالب موجب يا معلم ➖',
    'وصلت مرحلة {stage} وسكورك {score} ممتاز! عاود توا تفوتها بسهولة 🔥',
    'التلميح متاح ومجاني كل مرحلة، ليش مخليه زينة؟ استعمله وقت الحصلة! 💡'
  ],
  tauntsHigh: [
    'دماغك آلة حاسبة ما شاء الله! صمدت قدام الجذور والأسس 🔥',
    'المعادلتين المترابطتين يبوا تركيز جبار وإنت قدها، مرة زيادة وتخش التوب!',
    '{score} نقطة! والله حرام تضيع في آخر سؤال، جرب مرة ثانية وكسر الترتيب 😎',
    'الجذر التربيعي طيّر الفيوزات؟ سكورك {score} يرفع الراس ما شاء الله 🧠',
    'X خشت في الحسبة والمعادلة اختفت.. هادي تبي ذاكرة فوتوغرافية وإنت قريب منها!',
    'باقي القسمة (%) غدّار! أداء أسطوري في مرحلة {stage}، خش التوب توّا 🏆',
    '{score} نقطة في مرحلة {stage}! منافس خطير على صدارة الدوري 👑'
  ],
  live: [
    'معلم حساب! بونص ×1.5 في الجيب 🧮',
    'عقلك شغال نار! كومبو ×3 🔥',
    'رد بالك من الأقواس! الأولوية للداخل 👀',
    'حسبتها غلط! راح قلب 💔',
    'آخر قلب! احسبها صح قبل ما تضغط ⚡'
  ],
  howToPlay:
    'أكمل المعادلة الرياضية باختيار العملية الحسابية أو الرقم المجهول من بين الخيارات الـ 4 قبل نفاد الوقت.',
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

export function getTaunt(stage: number, score: number): string {
  const formattedScore = score.toLocaleString('en-US');
  let pool = mathBridgeContent.tauntsLow;

  if (stage >= 26) {
    pool = mathBridgeContent.tauntsHigh;
  } else if (stage >= 8) {
    pool = mathBridgeContent.tauntsMid;
  }

  // Prevent immediate repetition
  let pickIndex = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && pickIndex === lastMathBridgeTauntIdx) {
    pickIndex = (pickIndex + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  }
  lastMathBridgeTauntIdx = pickIndex;

  const template = pool[pickIndex] || pool[0]!;

  return template
    .replace(/\{stage\}/g, String(stage))
    .replace(/\{score\}/g, formattedScore);
}
