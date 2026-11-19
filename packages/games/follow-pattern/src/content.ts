export const INTRO_CARDS: Record<number, string> = {
  1: 'احفظ ترتيب الإضاءة وعيده بنفس الترتيب!',
  5: 'النمط صار أسرع، ركّز عيونك!',
  10: 'اقلب الشريط! عيد السلسلة بالعكس من الآخر للأول.',
  15: '6 أزرار الحين! مساحات أكثر وتركيز أكبر.',
  26: '8 أزرار وسلسلة طويلة! ورينا قوة ذاكرتك.',
  36: 'انتبه! الزر اللي يضوي بدون صوت وهمي، تجاهله!',
  46: 'طفّينا الضي! اسمع النغمات واعرف كل زر من صوته.',
  51: 'تخطّى الأحمر! عيد السلسلة بدون ما تلمس اللون الأحمر.',
  56: 'الأزرار بدّلت أماكنها! تبع اللون والرمز مش المكان.'
};

export const followPatternContent = {
  title: 'اتبع النمط',
  titleEn: 'Follow the Pattern',
  howToPlay:
    'احفظ تسلسل إضاءة ونغمات الأزرار أثناء طور العرض، ثم أعد الضغط عليها بنفس الترتيب المطلوب (أو بالعكس أو مع تخطي اللون) دون أي خطأ.',
  tauntsLow: [
    'ذاكرة سمكة يا غالي؟ 4 ألوان بس ونسيتهم في ثانية 😏',
    'ركز في الصوت واللون مع بعض، مش تتفرج وخلاص.. عاودها!',
    '{score} نقطة! هذي البداية بس، اشرب مية وركّز شوية.'
  ],
  tauntsMid: [
    'لما قلبناها بالعكس دخت شوية! ابدأ من آخر زر شفته وإرجع 👀',
    '6 أزرار لخبطوك؟ الذاكرة تبي تمرين، زيدها محاولة وتضبط!',
    '{score} نقطة! قريب تكمل السلسلة، خسارة ضيعتها في آخر ضغطة 😈',
    'حفظت الأول صح، بس في النص صبعك خانك.. ركّز وعاود!'
  ],
  tauntsHigh: [
    'ذاكرة فولاذية ما شاء الله! 12 خطوة ورا بعض، مرة زيادة وتخش التوب 🔥',
    'لما انطفى الضوء وسمعت الصوت بس كنت مبدع! عاودها وكسر الرقم القياسي.',
    '{score} نقطة! أداء أسطوري مع تبديل أماكن الأزرار، مستحيل توقف هنا 😎'
  ],
  live: [
    'اقلب الشريط! عيدها من الآخر للأول 🔄',
    'ذاكرة خارقة! 10 خطوات في راسك 🧠',
    'طفّينا الضي! اسمع النغمات زين 🎧',
    'تلخبط الترتيب! راح قلب 💔',
    'آخر قلب! ركّز في كل ضغطة ⚡'
  ]
};

let lastFollowPatternTauntIdx = -1;

export function getTaunt(score: number, stage: number): string {
  let pool = followPatternContent.tauntsLow;
  if (stage >= 19 || score >= 5000) {
    pool = followPatternContent.tauntsHigh;
  } else if (stage >= 7 || score >= 1500) {
    pool = followPatternContent.tauntsMid;
  }

  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === lastFollowPatternTauntIdx) {
    idx = (idx + 1) % pool.length;
  }
  lastFollowPatternTauntIdx = idx;

  const template = pool[idx]!;
  return template.replace('{score}', score.toLocaleString('en-US'));
}
