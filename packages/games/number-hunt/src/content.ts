export const INTRO_CARDS: Record<number, string> = {
  1: 'ادمج الأرقام بالعمليات الحسابية للوصول للهدف!',
  5: 'هدف أكبر! جرب تضرب الأرقام الكبيرة الأول.',
  8: 'انتبه! في عملية ممنوعة مقفولة المرة هذي.',
  12: 'صاروا 5 أرقام! خيارات أكثر وتفكير أعمق.',
  20: 'الرقم المقفل بالذهبي لازم يكون آخر خطوة!',
  26: '6 أرقام وعمليتين ممنوعتين! شغل عقلك صح.',
  36: 'لازم تستعمل كل الأرقام الـ 6 وما يفضل ولا بطاقة!',
  46: 'الأهداف صارت عشرية! القسمة تطلع كسور الآن.',
  56: 'الهدف ممكن يكون بالسالب! اطرح الكبير من الصغير.'
};

let lastNumberHuntTauntIdx = -1;

export const numberHuntContent = {
  title: 'صيد الرقم',
  titleEn: 'Number Hunt',
  howToPlay:
    'ادمج بطاقات الأرقام باستخدام العمليات الحسابية (+، −، ×، ÷) للوصول للرقم الهدف بالضبط قبل نفاد الوقت. يمكنك التراجع أو المسح في أي وقت دون عقوبة.',

  tauntsLow: [
    '4 أرقام والهدف صغير ما جبتاش؟ تي حتى بالصوابع تنحسب هذي، ركّز وعاود 😏',
    'عندك زر تراجع (Undo) راهو، مش لازم تقعد تتفرج على الرقم لين يطير الوقت!',
    '{score} نقطة! واضح إنك تحسب بالبركة، اضرب الأرقام الكبيرة الأول وعاود 🧮',
    'الهدف كان قدام عيونك! وسع بالك ورتب خطوات الدمج صح 🎯',
    'استعجلت في أول عمليتين وحصلت في الأخير؟ جرب تبدأ بالعكس وتجيبها!',
    'الوقت مشى وإنت ما زلت تفكر في أول خطوة؟ بادر وجرب ومش حتخسر شي 😎'
  ],

  tauntsMid: [
    'لما منعنا الضرب تكتفت يديك؟ فكّر بره الصندوق يا غالي، الجمع والطرح يخدموا 👀',
    'قريب تجيب الهدف، كان ناقصك خطوة وحدة بس.. زيدها محاولة وتضبط!',
    '5 أرقام لخبطوك شوية؟ خذ نفس، ابدأ من الهدف وانزل لتحت تو تلقاها ساهلة 🎯',
    '{score} نقطة! حلوة المحاولة، بس الوقت غلبك في الأخيرة.. أسرع شوية!',
    'الرقم المقفل بالذهبي حرقلك أعصابك؟ ركز كيف تخليه آخر مفتاح 🔑',
    'تلميح (💡 1) موجود كل مرحلة ويحللك أول خطوة، استعمله وقت الحصلة!'
  ],

  tauntsHigh: [
    'ما شاء الله عليك! دماغك يوزن بلد، تحل في ألغاز تدوّخ، مرة زيادة وتكسر الرقم 🔥',
    'الأرقام العشرية والمقفلة ما يقدرلها إلا واحد راسه نظيف زيك.. عاودها وخش التوب 👑',
    '{score} نقطة! والله كنت قريب من الهدف، غلطة بسيطة في النص ضيعتها، جرب مرة ثانية 😎',
    'صيد أرقام أسطوري! وصلت لمرحلة {stage} وسكورك يرفع الراس 🧠',
    'الهدف السالب كان فخ محكم! محاولة تانية وتنتقم منه وتخش الصدارة ⚡'
  ],

  live: [
    'قناص أرقام! جبتها في لمح البصر 🎯',
    'انتبه! في عملية ممنوعة مقفولة 🚫',
    'آخر 10 ثواني! أدمج بسرعة ⏳',
    'عبقري حساب! بونص ×3 مولّع 🔥',
    'آخر قلب! احسب خطواتك صح 💔'
  ],

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
  let pool = numberHuntContent.tauntsLow;

  if (stage >= 16) {
    pool = numberHuntContent.tauntsHigh;
  } else if (stage >= 6) {
    pool = numberHuntContent.tauntsMid;
  }

  // Prevent immediate repetition
  let pickIndex = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && pickIndex === lastNumberHuntTauntIdx) {
    pickIndex = (pickIndex + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  }
  lastNumberHuntTauntIdx = pickIndex;

  const template = pool[pickIndex] || pool[0]!;

  return template
    .replace(/\{stage\}/g, String(stage))
    .replace(/\{score\}/g, formattedScore);
}
