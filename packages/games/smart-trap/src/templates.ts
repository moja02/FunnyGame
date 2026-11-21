import type { Rng } from '@funnygame/game-core';

export interface ParametricPuzzleInstance {
  id: string;
  categoryAr: string;
  promptAr: string;
  correctAnswer: string;
  trapAnswer: string;
  distractors: string[];
  explanationAr: string;
}

export interface PuzzleTemplate {
  id: string;
  categoryAr: string;
  minStage: number;
  generate: (rng: Rng, stage: number) => ParametricPuzzleInstance;
}

const LIBYAN_NAMES = ['سالم', 'طارق', 'مفتاح', 'عمر', 'علي', 'أحمد', 'فرج', 'نوري'];
const FEMALE_NAMES = ['ليلى', 'سارة', 'هدى', 'فاطمة', 'مريم', 'خديجة', 'نور'];

export const PUZZLE_TEMPLATES: PuzzleTemplate[] = [
  // 1. Bat & Ball / Item Pair with Difference (المضرب والكرة)
  {
    id: 'item_pair_difference',
    categoryAr: 'لغز خدعة كلاسيكي 🎾',
    minStage: 1,
    generate: (rng) => {
      const items = [
        { big: 'مضرب', small: 'كرة' },
        { big: 'كتاب', small: 'قلم' },
        { big: 'حقيبة', small: 'دفتر' },
        { big: 'ساعة', small: 'سوار' }
      ];
      const item = items[Math.floor(rng.next() * items.length)]!;
      const totalPairs = [
        { total: 11, diff: 10, correct: '0.5', trap: '1.0' },
        { total: 21, diff: 20, correct: '0.5', trap: '1.0' },
        { total: 110, diff: 100, correct: '5', trap: '10' },
        { total: 22, diff: 20, correct: '1.0', trap: '2.0' },
        { total: 55, diff: 50, correct: '2.5', trap: '5.0' }
      ];
      const p = totalPairs[Math.floor(rng.next() * totalPairs.length)]!;
      return {
        id: 'item_pair_difference',
        categoryAr: 'لغز خدعة كلاسيكي 🎾',
        promptAr: `سعر ${item.big} و${item.small} معاً هو ${p.total} دينار. إذا كان سعر ${item.big} يزيد بمقدار ${p.diff} دينار عن سعر ${item.small}، فكم سعر ${item.small}؟`,
        correctAnswer: `${p.correct} دينار`,
        trapAnswer: `${p.trap} دينار`,
        distractors: [
          `${(parseFloat(p.correct) + 1).toFixed(1)} دينار`,
          `${(parseFloat(p.trap) + 1).toFixed(1)} دينار`
        ],
        explanationAr: `لأن سعر ${item.big} ${(p.diff + parseFloat(p.correct)).toFixed(1)} وسعر ${item.small} ${p.correct}، فالمجموع ${p.total} والفرق ${p.diff} دينار!`
      };
    }
  },

  // 2. Apples in Basket / Taking Items
  {
    id: 'taking_items_from_basket',
    categoryAr: 'لغز خدعة لغوي 🍎',
    minStage: 1,
    generate: (rng) => {
      const fruits = ['تفاحات', 'برتقالات', 'حبات تمر', 'قطع حلوى'];
      const fruit = fruits[Math.floor(rng.next() * fruits.length)]!;
      const total = 7 + Math.floor(rng.next() * 5); // 7 to 11
      const taken = 3 + Math.floor(rng.next() * 3); // 3 to 5
      const remaining = total - taken;

      return {
        id: 'taking_items_from_basket',
        categoryAr: 'لغز خدعة لغوي 🍎',
        promptAr: `يوجد في السلة ${total} ${fruit}. إذا أخذت أنت منها ${taken} ${fruit}، فكم ${fruit} أصبحت معك أنت الآن؟`,
        correctAnswer: `${taken} ${fruit}`,
        trapAnswer: `${remaining} ${fruit}`,
        distractors: [`${total} ${fruit}`, `${taken - 1} ${fruit}`],
        explanationAr: `أنت أخذت ${taken} ${fruit} بيدك، إذن أصبح معك أنت شخصياً ${taken} ${fruit}، بينما المتبقي في السلة هو ${remaining}!`
      };
    }
  },

  // 3. Doctor's Pills Prescription (حبات الدواء)
  {
    id: 'doctor_pills',
    categoryAr: 'حساب زمني مخادع 💊',
    minStage: 2,
    generate: (rng) => {
      const pillConfigs = [
        { count: 3, intervalHours: 1, correct: 2, trap: 3 },
        { count: 4, intervalHours: 1, correct: 3, trap: 4 },
        { count: 3, intervalHours: 2, correct: 4, trap: 6 },
        { count: 5, intervalHours: 1, correct: 4, trap: 5 }
      ];
      const cfg = pillConfigs[Math.floor(rng.next() * pillConfigs.length)]!;
      return {
        id: 'doctor_pills',
        categoryAr: 'حساب زمني مخادع 💊',
        promptAr: `وصف لك الطبيب ${cfg.count} حبات دواء، بحيث تأخذ حبة واحدة كل ${cfg.intervalHours === 1 ? 'ساعة' : `${cfg.intervalHours} ساعات`}. كم ساعة يستغرق تناول جميع الحبات؟`,
        correctAnswer: `${cfg.correct} ${cfg.correct === 2 ? 'ساعتان' : 'ساعات'}`,
        trapAnswer: `${cfg.trap} ساعات`,
        distractors: [
          `${cfg.correct + 1} ساعات`,
          `${cfg.trap + 1} ساعات`
        ],
        explanationAr: `الحبة الأولى تؤخذ في البداية فوراً (الساعة 0)، إذن المدة الفعلية هي ${cfg.correct} ${cfg.correct === 2 ? 'ساعتان' : 'ساعات'} فقط!`
      };
    }
  },

  // 4. Runner in a Race (تجاوز المركز الثاني)
  {
    id: 'race_second_place',
    categoryAr: 'سباق ومواقع 🏃‍♂️',
    minStage: 4,
    generate: (rng) => {
      const positions = [
        { passed: 'الثاني', correct: 'المركز الثاني', trap: 'المركز الأول', d1: 'المركز الثالث', d2: 'المركز الأخير' },
        { passed: 'الثالث', correct: 'المركز الثالث', trap: 'المركز الثاني', d1: 'المركز الرابع', d2: 'المركز الأول' },
        { passed: 'الخامس', correct: 'المركز الخامس', trap: 'المركز الرابع', d1: 'المركز السادس', d2: 'المركز الأول' }
      ];
      const p = positions[Math.floor(rng.next() * positions.length)]!;
      return {
        id: 'race_second_place',
        categoryAr: 'سباق ومواقع 🏃‍♂️',
        promptAr: `في سباق جري، تجاوزت أنت المتسابق الذي كان في المركز ${p.passed}. ما هو مركزك أنت الآن في السباق؟`,
        correctAnswer: p.correct,
        trapAnswer: p.trap,
        distractors: [p.d1, p.d2],
        explanationAr: `عندما تتجاوز صاحب المركز ${p.passed}، فإنك تحل محله تماماً وتصبح أنت في ${p.correct}!`
      };
    }
  },

  // 5. Overtaking the Last Runner (تجاوز المتسابق الأخير)
  {
    id: 'race_last_place',
    categoryAr: 'مفارقة منطقية 🏁',
    minStage: 5,
    generate: () => {
      return {
        id: 'race_last_place',
        categoryAr: 'مفارقة منطقية 🏁',
        promptAr: 'في سباق للجري، تجاوزت المتسابق الأخير. ما هو مركزك الآن في السباق؟',
        correctAnswer: 'مستحيل منطقياً',
        trapAnswer: 'المركز قبل الأخير',
        distractors: ['المركز الأخير', 'المركز الأول'],
        explanationAr: 'مستحيل أن تتجاوز المتسابق الأخير! لأنك لو كنت خلفه لما كان هو الأخير أصلاً!'
      };
    }
  },

  // 6. Machines and Production Rate (الآلات والقطع)
  {
    id: 'machines_rate',
    categoryAr: 'زمن ومعدلات ⏱️',
    minStage: 7,
    generate: (rng) => {
      const configs = [
        { machines1: 5, items1: 5, mins: 5, machines2: 100, items2: 100, trap: '100 دقيقة' },
        { machines1: 3, items1: 3, mins: 3, machines2: 60, items2: 60, trap: '60 دقيقة' },
        { machines1: 4, items1: 4, mins: 4, machines2: 40, items2: 40, trap: '40 دقيقة' }
      ];
      const c = configs[Math.floor(rng.next() * configs.length)]!;
      return {
        id: 'machines_rate',
        categoryAr: 'زمن ومعدلات ⏱️',
        promptAr: `إذا كانت ${c.machines1} آلات تستغرق ${c.mins} دقائق لصنع ${c.items1} قطع، فكم دقيقة تستغرق ${c.machines2} آلة لصنع ${c.items2} قطعة؟`,
        correctAnswer: `${c.mins} دقائق`,
        trapAnswer: c.trap,
        distractors: [`${c.mins * 2} دقائق`, 'دقيقة واحدة'],
        explanationAr: `الآلة الواحدة تصنع قطعة واحدة في ${c.mins} دقائق، لذلك فإن ${c.machines2} آلة تعمل في نفس الوقت وتصنع ${c.machines2} قطعة في ${c.mins} دقائق أيضاً!`
      };
    }
  },

  // 7. Water Lily Doubling in Lake (تضاعف زنبق الماء)
  {
    id: 'lily_doubling',
    categoryAr: 'نمو أسي وتضاعف 🌊',
    minStage: 9,
    generate: (rng) => {
      const days = [20, 30, 48, 60][Math.floor(rng.next() * 4)]!;
      const halfDay = Math.floor(days / 2);
      const correctDay = days - 1;
      return {
        id: 'lily_doubling',
        categoryAr: 'نمو أسي وتضاعف 🌊',
        promptAr: `نبتة زنبق يتضاعف حجمها كل يوم، وغطّت سطح البحيرة بالكامل في ${days} يوماً. في أي يوم كانت النبتة تغطي نصف مساحة البحيرة بالضبط؟`,
        correctAnswer: `اليوم ${correctDay}`,
        trapAnswer: `اليوم ${halfDay}`,
        distractors: [`اليوم ${days - 2}`, `اليوم ${halfDay + 1}`],
        explanationAr: `بما أن النبتة يتضاعف حجمها يومياً، ففي اليوم ${correctDay} كانت تغطي نصف البحيرة ثم تضاعفت في اليوم ${days} لتغطيها بالكامل!`
      };
    }
  },

  // 8. Age Constant Difference (فارق العمر الثابت)
  {
    id: 'age_difference',
    categoryAr: 'أعمار وعلاقات 🎂',
    minStage: 12,
    generate: (rng) => {
      const names = LIBYAN_NAMES;
      const brotherName = names[Math.floor(rng.next() * names.length)]!;
      const configs = [
        { agePast: 6, ageNow: 40, diff: 3, trap: 20 },
        { agePast: 8, ageNow: 50, diff: 4, trap: 25 },
        { agePast: 10, ageNow: 60, diff: 5, trap: 30 },
        { agePast: 4, ageNow: 30, diff: 2, trap: 15 }
      ];
      const c = configs[Math.floor(rng.next() * configs.length)]!;
      const correctAge = c.ageNow - c.diff;
      return {
        id: 'age_difference',
        categoryAr: 'أعمار وعلاقات 🎂',
        promptAr: `عندما كان عمري ${c.agePast} سنوات، كان أخي ${brotherName} في نصف عمري. الآن عمري ${c.ageNow} سنة، فكم عمر أخي ${brotherName}؟`,
        correctAnswer: `${correctAge} سنة`,
        trapAnswer: `${c.trap} سنة`,
        distractors: [`${correctAge + 2} سنة`, `${correctAge - 2} سنة`],
        explanationAr: `فارق السن بينكما ثابت ولا يتغير أبداً (${c.diff} سنوات)، إذن عندما تبلغ ${c.ageNow} سنة يكون عمره ${correctAge} سنة!`
      };
    }
  },

  // 9. Truth-Teller & Liar - Fork in Road (مفترق الطرق)
  {
    id: 'liar_fork_road',
    categoryAr: 'صادق وكاذب 🎭',
    minStage: 15,
    generate: () => {
      return {
        id: 'liar_fork_road',
        categoryAr: 'صادق وكاذب 🎭',
        promptAr: 'وصلت لمفترق طريقين (أحدهما ينجي والآخر يهلك). يقف حارسان: أحدهما صادق دائماً والآخر كذاب دائماً. بسؤال واحد فقط لأحدهما، كيف تعرف طريق النجاة؟',
        correctAnswer: '«أي طريق سيقول لي رفيقك أنه طريق النجاة؟» ثم أسلك العكس',
        trapAnswer: '«أي طريق هو طريق النجاة المؤكد؟» ثم أسلكه مباشرة',
        distractors: [
          '«هل أنت الحارس الصادق؟» ثم أسأله عن الطريق',
          '«هل رفيقك حارس كاذب؟» ثم أسلك ما يشير إليه'
        ],
        explanationAr: 'سؤال أي حارس عما سيقوله رفيقه يضمن دائماً الحصول على إجابة كاذبة، لذلك نسلك الطريق العكسي حتماً!'
      };
    }
  },

  // 10. Both Liars Statement Paradox (مفارقة الصادق والكاذب)
  {
    id: 'liar_statement_paradox',
    categoryAr: 'منطق البوابات 🎭',
    minStage: 17,
    generate: (rng) => {
      const name1 = LIBYAN_NAMES[Math.floor(rng.next() * LIBYAN_NAMES.length)]!;
      let name2 = LIBYAN_NAMES[Math.floor(rng.next() * LIBYAN_NAMES.length)]!;
      while (name2 === name1) {
        name2 = LIBYAN_NAMES[(LIBYAN_NAMES.indexOf(name1) + 1) % LIBYAN_NAMES.length]!;
      }
      return {
        id: 'liar_statement_paradox',
        categoryAr: 'منطق البوابات 🎭',
        promptAr: `يقف ${name1} و${name2}. قال ${name1}: «كلانا كاذبان دائماً». ماذا نستنتج عن صدقهما منطقياً؟`,
        correctAnswer: `${name1} كاذب و${name2} صادق`,
        trapAnswer: 'كلاهما كاذبان كما قال',
        distractors: [
          'كلاهما صادقان',
          `${name1} صادق و${name2} كاذب`
        ],
        explanationAr: `لو كان ${name1} صادقاً لكان كلامه صحيحاً بأنه كاذب وهو تناقض! إذن هو كاذب وتصريحه باطل، وشريكه ${name2} صادق!`
      };
    }
  },

  // 11. Socks / Marbles in the Dark (الاحتمالات واليقين في الظلام)
  {
    id: 'socks_in_dark',
    categoryAr: 'يقين واحتمالات 🧦',
    minStage: 21,
    generate: (rng) => {
      const black = 10 + Math.floor(rng.next() * 5); // 10 to 14
      const white = 10 + Math.floor(rng.next() * 5); // 10 to 14
      const half = Math.floor((black + white) / 2);
      return {
        id: 'socks_in_dark',
        categoryAr: 'يقين واحتمالات 🧦',
        promptAr: `في خزانة مظلمة يوجد ${black} جوارب سوداء و${white} جوارب بيضاء مخلوطة. ما هو أقل عدد جوارب تسحبها عشوائياً لضمان زوج من نفس اللون حتماً؟`,
        correctAnswer: '3 جوارب',
        trapAnswer: `${black + 1} جوارب`,
        distractors: [`${half} جوارب`, '2 جوارب'],
        explanationAr: 'يوجد لونان فقط (أسود وأبيض)؛ أسوأ احتمال أن تسحب جورباً أسود وجورباً أبيض، والجورب الثالث سيطابق أحدهما حتماً!'
      };
    }
  },

  // 12. Ordering & Height Elimination (ترتيب واستبعاد)
  {
    id: 'ordering_height',
    categoryAr: 'ترتيب واستبعاد 📏',
    minStage: 26,
    generate: (rng) => {
      const names = [...LIBYAN_NAMES];
      // Pick 3 distinct names
      const n1 = names.splice(Math.floor(rng.next() * names.length), 1)[0]!;
      const n2 = names.splice(Math.floor(rng.next() * names.length), 1)[0]!;
      const n3 = names.splice(Math.floor(rng.next() * names.length), 1)[0]!;

      // Relation: n1 > n3 > n2  (Tallest: n1, Middle: n3, Shortest: n2)
      return {
        id: 'ordering_height',
        categoryAr: 'ترتيب واستبعاد 📏',
        promptAr: `${n1} أطول من ${n2}، و${n2} أقصر من ${n3}، بينما ${n3} أقصر من ${n1}. من هو الشخص الأقصر بينهم جميعاً؟`,
        correctAnswer: n2,
        trapAnswer: n3,
        distractors: [n1, 'لا يمكن الاستنتاج'],
        explanationAr: `بترتيب الأطوال من الأطول للأقصر: (${n1} ثم ${n3} ثم ${n2})، إذن الأقصر بينهم حتماً هو ${n2}!`
      };
    }
  },

  // 13. Three Persons Truth - One is Truthful (صادق واحد من ثلاثة)
  {
    id: 'three_persons_truth',
    categoryAr: 'الصادق والكاذب 👥',
    minStage: 36,
    generate: (rng) => {
      const names = [...LIBYAN_NAMES];
      const a = names.splice(Math.floor(rng.next() * names.length), 1)[0]!;
      const b = names.splice(Math.floor(rng.next() * names.length), 1)[0]!;
      const c = names.splice(Math.floor(rng.next() * names.length), 1)[0]!;

      // Statements:
      // a: "b is a liar"
      // b: "c is a liar"
      // c: "both a and b are liars"
      // If a is true -> b is liar -> c is truth-teller (contradiction: two true).
      // If b is true -> a is liar, c is liar. Does this work?
      // If c is liar, not both are liars (true, because b is true).
      // So B is the only truth-teller!
      return {
        id: 'three_persons_truth',
        categoryAr: 'الصادق والكاذب 👥',
        promptAr: `ثلاثة أشخاص (${a}، ${b}، ${c})، واحد منهم فقط يقول الصدق دائماً والآخران يكذبان دائماً. قال ${a}: «${b} كاذب»، وقال ${b}: «${c} كاذب»، وقال ${c}: «${a} و${b} كلاهما كاذبان». من هو الصادق الوحيد؟`,
        correctAnswer: b,
        trapAnswer: a,
        distractors: [c, 'جميعهم كاذبون'],
        explanationAr: `لو افترضنا صدق ${b}، فإن ${c} كاذب و${a} كاذب، وتنسجم كافة التصريحات بدون أي تناقض، إذن ${b} هو الصادق الوحيد!`
      };
    }
  },

  // 14. Logic Grid 4 Elements x Attributes (جدول منطقي)
  {
    id: 'logic_grid_attributes',
    categoryAr: 'جداول منطقية متقاطعة 📋',
    minStage: 46,
    generate: (rng) => {
      const names = ['سالم', 'طارق', 'مفتاح'];
      const colors = ['حمراء', 'زرقاء', 'بيضاء'];

      // Assign:
      // طارق = زرقاء
      // سالم = بيضاء (سالم لا يملك الحمراء)
      // مفتاح = حمراء
      return {
        id: 'logic_grid_attributes',
        categoryAr: 'جداول منطقية متقاطعة 📋',
        promptAr: `ثلاثة أصدقاء (${names[0]}، ${names[1]}، ${names[2]}) يملكون ثلاث سيارات بألوان (${colors[0]}، ${colors[1]}، ${colors[2]}). إذا علمت أن ${names[1]} يملك السيارة ${colors[1]}، و${names[0]} لا يملك السيارة ${colors[0]}، فما هو لون سيارة ${names[2]}؟`,
        correctAnswer: `السيارة ${colors[0]}`,
        trapAnswer: `السيارة ${colors[2]}`,
        distractors: [`السيارة ${colors[1]}`, 'سوداء'],
        explanationAr: `${names[1]} يملك ${colors[1]}، و${names[0]} لا يملك ${colors[0]} إذن يملك ${colors[2]}، فيتبقى لـ ${names[2]} ${colors[0]} حتماً!`
      };
    }
  },

  // 15. Race Track Laps & Overtaking (دورات المضمار)
  {
    id: 'race_laps_overtaking',
    categoryAr: 'سرعة ودورات 🏎️',
    minStage: 56,
    generate: (rng) => {
      const name = LIBYAN_NAMES[Math.floor(rng.next() * LIBYAN_NAMES.length)]!;
      return {
        id: 'race_laps_overtaking',
        categoryAr: 'سرعة ودورات 🏎️',
        promptAr: `في سباق سيارات دائري، تجاوزت سيارة ${name} المتسابق الأخير بدورة كاملة. ما هو ترتيب سيارة ${name} الآن؟`,
        correctAnswer: 'لا يمكن تحديد المركز من هذه المعلومة',
        trapAnswer: 'المركز الأول حتماً',
        distractors: ['المركز الثاني', 'المركز الأخير'],
        explanationAr: 'تجاوز المتسابق الأخير بدورة كاملة يعني فقط أنك أسرع منه، ولكن لا يعني بالضرورة أنك في المركز الأول (قد تكون الخامس أو الثاني)!'
      };
    }
  }
];
