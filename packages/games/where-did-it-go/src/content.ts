export const INTRO_CARDS: Record<number, string> = {
  1: 'احفظ أماكن الصور قبل ما تنقلب البطاقات!',
  5: 'هالمرة مطلوب بطاقتين في نفس الشبكة!',
  7: 'انتبه! البطاقات تبدّل أماكنها بعد ما تنقلب.',
  10: 'لازم تفتح البطاقات المطلوبة بالترتيب المحدد فوق!',
  12: 'الصور صارت متشابهة جداً، دقّق في التفاصيل!',
  26: 'شبكة 36 بطاقة ولمحة 0.7 ثانية بس!',
  46: 'البطاقات تتبدل وهي تنقلب في نفس اللحظة!'
};

export const whereDidItGoContent = {
  title: 'أين اختفت؟',
  titleEn: 'Where Did It Go?',
  howToPlay:
    'احفظ أماكن الصور قبل أن تنقلب البطاقات، راقب حركة التبديل إن وجدت، ثم اضغط على الأماكن الصحيحة للبطاقات المطلوبة بالترتيب قبل نفاد الوقت.',
  tauntsLow: [
    'البطاقة كانت قدام عيونك من ثانية! وين سرحت يا غالي 😏',
    '3×3 وتدور فيها بالبركة؟ ركّز في الزوايا أول ما تنفتح الشبكة!',
    '{score} نقطة! واضح إنك ترمش وقت تنقلب البطاقات، افتح عيونك وعاود.'
  ],
  tauntsMid: [
    'لما بدوا يتبدلوا البطاقات ضيّعت البوصلة! تبع البطاقة بعينك بس 👀',
    'الصور المتشابهة خدعتك شوية! زيدها محاولة وتلقط الفرق.',
    '{score} نقطة! قريب تفتح الثلاثة بالترتيب، خسارة غلطة وحدة طيّرتها 😈',
    'ذاكرتك حلوة، بس تبي شوية سرعة قبل ما يخلص الشريط!'
  ],
  tauntsHigh: [
    'عيون صقر وذاكرة حديد! 36 بطاقة في 0.7 ثانية وتجيبهم؟ 🔥',
    'لما تبدلوا أثناء القلب كنت وحش! مرة زيادة وتكسر الرقم القياسي.',
    '{score} نقطة! أداء خرافي في الشبكة الكبيرة هذي، جرب مرة ثانية وخش التوب 😎'
  ],
  live: [
    'انتبه! البطاقات بدّلت أماكنها 👀',
    'قناص ذاكرة! بالترتيب المسطرة 🎯',
    'غمضة عين وتختفي! ركّز ⚡',
    'ولا بطاقة تفوتك! كومبو ×3 🔥',
    'آخر قلب! تأكد من المكان قبل ما تلمس 💔'
  ]
};

let lastWhereDidItGoTauntIdx = -1;

export function getTaunt(score: number, stage: number): string {
  let pool = whereDidItGoContent.tauntsLow;
  if (stage >= 19 || score >= 5000) {
    pool = whereDidItGoContent.tauntsHigh;
  } else if (stage >= 7 || score >= 1500) {
    pool = whereDidItGoContent.tauntsMid;
  }

  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === lastWhereDidItGoTauntIdx) {
    idx = (idx + 1) % pool.length;
  }
  lastWhereDidItGoTauntIdx = idx;

  const template = pool[idx]!;
  return template.replace('{score}', score.toLocaleString('en-US'));
}
