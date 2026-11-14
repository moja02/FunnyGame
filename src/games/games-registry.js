/**
 * GamesRegistry - Central registry for all mini-games in FunnyGame
 */
export const GAMES_REGISTRY = [
  {
    id: 'time-duel',
    title: 'الفارق الزمني',
    subtitle: 'دقة الـ 0.00 ثانية',
    icon: '⏱️',
    status: '● متاح للعب',
    statusColor: '#2ecc71',
    isActive: true,
    category: 'speed',
    description: 'تحدي الإحساس بالوقت وإيقاف العداد عند اللحظة المحددة بالضبط!'
  },
  {
    id: 'color-trap',
    title: 'فخ الألوان',
    subtitle: 'سرعة بديهة بصرية',
    icon: '🎨',
    status: '🔒 قريباً',
    statusColor: 'rgba(255, 255, 255, 0.38)',
    isActive: false,
    category: 'focus',
    description: 'اختر لون الخط الحقيقي متجاهلاً الكلمة المكتوبة لاختبار سرعة معالجة الدماغ للمعلومات المتناقضة.'
  },
  {
    id: 'cup-shuffle',
    title: 'تتبع الكؤوس',
    subtitle: 'قوة التركيز الخارق',
    icon: '🥤',
    status: '🔒 قريباً',
    statusColor: 'rgba(255, 255, 255, 0.38)',
    isActive: false,
    category: 'memory',
    description: 'تتبع الكأس الذي يحتوي على الكرة تحت سرعات دوران وتبديل جنونية.'
  },
  {
    id: 'speed-math',
    title: 'حساب البرق',
    subtitle: 'ذكاء ورياضيات خاطفة',
    icon: '⚡',
    status: '🔒 قريباً',
    statusColor: 'rgba(255, 255, 255, 0.38)',
    isActive: false,
    category: 'math',
    description: 'معادلات حسابية تومض لثانية واحدة فقط وتحتاج إجابة فورية قبل أن تنفجر!'
  }
];
