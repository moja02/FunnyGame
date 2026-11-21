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

export const LIBYAN_MALE_NAMES = [
  'سالم', 'طارق', 'مفتاح', 'عمر', 'علي', 'أحمد', 'فرج', 'نوري',
  'محمود', 'فتحي', 'إبراهيم', 'بلقاسم', 'رمضان', 'ميلود', 'الصادق', 'حميد'
];

export const LIBYAN_FEMALE_NAMES = [
  'ليلى', 'سارة', 'هدى', 'فاطمة', 'مريم', 'خديجة', 'نور', 'عائشة',
  'زينب', 'منى', 'أسماء', 'جميلة', 'سلوى', 'حنان'
];

export const LIBYAN_CITIES = [
  'طرابلس', 'بنغازي', 'مصراتة', 'الزاوية', 'البيضاء', 'سبها', 'طبرق', 'زليتن', 'سرت', 'غريان'
];

function pickOne<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng.next() * arr.length)]!;
}

function pickDistinct<T>(rng: Rng, arr: T[], count: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(rng.next() * copy.length);
    result.push(copy.splice(idx, 1)[0]!);
  }
  return result;
}

export const PUZZLE_TEMPLATES: PuzzleTemplate[] = [
  // ----------------------------------------------------
  // GROUP 1: Warmup & Classic Cognitive Traps (Stages 1-3)
  // ----------------------------------------------------

  // 1. Bat & Ball / Item Pair with Difference (المضرب والكرة والسلع المزدوجة)
  {
    id: 'item_pair_difference',
    categoryAr: 'لغز خدعة كلاسيكي 🎾',
    minStage: 1,
    generate: (rng) => {
      const items = [
        { big: 'مضرب', small: 'كرة' },
        { big: 'كتاب', small: 'قلم' },
        { big: 'حقيبة', small: 'دفتر' },
        { big: 'ساعة', small: 'سوار' },
        { big: 'هاتف', small: 'غلاف حماية' },
        { big: 'دراجة', small: 'خوذة' },
        { big: 'طاولة', small: 'كرسي' },
        { big: 'قميص', small: 'ربطة عنق' }
      ];
      const item = pickOne(rng, items);
      const totalPairs = [
        { total: 11, diff: 10, correct: '0.5', trap: '1.0' },
        { total: 21, diff: 20, correct: '0.5', trap: '1.0' },
        { total: 110, diff: 100, correct: '5', trap: '10' },
        { total: 22, diff: 20, correct: '1.0', trap: '2.0' },
        { total: 55, diff: 50, correct: '2.5', trap: '5.0' },
        { total: 33, diff: 30, correct: '1.5', trap: '3.0' },
        { total: 44, diff: 40, correct: '2.0', trap: '4.0' },
        { total: 105, diff: 100, correct: '2.5', trap: '5.0' }
      ];
      const p = pickOne(rng, totalPairs);
      const cVal = parseFloat(p.correct);
      const tVal = parseFloat(p.trap);

      return {
        id: 'item_pair_difference',
        categoryAr: 'لغز خدعة كلاسيكي 🎾',
        promptAr: `سعر ${item.big} و${item.small} معاً هو ${p.total} دينار. إذا كان سعر ${item.big} يزيد بمقدار ${p.diff} دينار عن سعر ${item.small}، فكم سعر ${item.small}؟`,
        correctAnswer: `${p.correct} دينار`,
        trapAnswer: `${p.trap} دينار`,
        distractors: [
          `${(cVal + 1.5).toFixed(1)} دينار`,
          `${(tVal + 2).toFixed(1)} دينار`
        ],
        explanationAr: `لأن سعر ${item.big} ${(p.diff + cVal).toFixed(1)} وسعر ${item.small} ${p.correct}، فالمجموع ${p.total} والفرق ${p.diff} دينار!`
      };
    }
  },

  // 2. Apples in Basket / Taking Items (أخذ العناصر من السلة)
  {
    id: 'taking_items_from_basket',
    categoryAr: 'لغز خدعة لغوي 🍎',
    minStage: 1,
    generate: (rng) => {
      const fruits = ['تفاحات', 'برتقالات', 'حبات تمر', 'قطع شكلاطة', 'أقلام'];
      const fruit = pickOne(rng, fruits);
      const taken = 3 + Math.floor(rng.next() * 3); // 3 to 5
      let total = 8 + Math.floor(rng.next() * 6); // 8 to 13
      if (total === taken * 2) {
        total += 1;
      }
      const remaining = total - taken;
      const d2 = taken + 1 === remaining ? taken + 2 : taken + 1;

      return {
        id: 'taking_items_from_basket',
        categoryAr: 'لغز خدعة لغوي 🍎',
        promptAr: `يوجد في السلة ${total} ${fruit}. إذا أخذت أنت منها ${taken} ${fruit} بيدك، فكم ${fruit} أصبحت معك أنت الآن؟`,
        correctAnswer: `${taken} ${fruit}`,
        trapAnswer: `${remaining} ${fruit}`,
        distractors: [`${total} ${fruit}`, `${d2} ${fruit}`],
        explanationAr: `أنت أخذت ${taken} ${fruit}، إذن أصبح معك أنت شخصياً ${taken} ${fruit}، بينما المتبقي في السلة هو ${remaining}!`
      };
    }
  },

  // 3. Month with 28 Days (أشهر السنة وأيامها)
  {
    id: 'month_days_28',
    categoryAr: 'فخ البديهة والتقويم 📅',
    minStage: 1,
    generate: () => {
      return {
        id: 'month_days_28',
        categoryAr: 'فخ البديهة والتقويم 📅',
        promptAr: 'كم شهراً في السنة الميلادية يحتوي على 28 يوماً على الأقل؟',
        correctAnswer: 'كل الأشهر الـ 12',
        trapAnswer: 'شهر واحد فقط',
        distractors: ['شهرين فقط', '6 أشهر'],
        explanationAr: 'كل أشهر السنة الـ 12 تحتوي على 28 يوماً على الأقل (فبراير فيه 28 وباقي الأشهر 30 أو 31)! الفخ هو حصر التفكير في فبراير فقط!'
      };
    }
  },

  // 4. Dirt in a Hole (التراب في الحفرة)
  {
    id: 'dirt_in_hole',
    categoryAr: 'لغز خدعة هندسي 🕳️',
    minStage: 1,
    generate: (rng) => {
      const d = 2 + Math.floor(rng.next() * 3); // 2 to 4
      const w = 2 + Math.floor(rng.next() * 2); // 2 to 3
      const l = 3 + Math.floor(rng.next() * 3); // 3 to 5
      const volume = d * w * l;

      return {
        id: 'dirt_in_hole',
        categoryAr: 'لغز خدعة هندسي 🕳️',
        promptAr: `حفرة مستطيلة في الأرض عمقها ${d} أمتار، وعرضها ${w} أمتار، وطولها ${l} أمتار. كم متراً مكعباً من التراب يوجد داخل هذه الحفرة؟`,
        correctAnswer: 'صفر (لا تراب في الحفرة)',
        trapAnswer: `${volume} أمتار مكعبة`,
        distractors: [`${d * w} أمتار مكعبة`, '1 متر مكعب'],
        explanationAr: 'الحفرة هي تجويف فارغ في الأرض ولا يوجد أي تراب بداخلها! الفخ يكمن في حساب حاصل ضرب الأبعاد!'
      };
    }
  },

  // 5. Divide by Half (القسمة على نصف)
  {
    id: 'divide_by_half',
    categoryAr: 'فخ حسابي مخادع ➗',
    minStage: 1,
    generate: (rng) => {
      const numbers = [
        { n: 20, k: 10, correct: 50, trap: 20 },
        { n: 30, k: 10, correct: 70, trap: 25 },
        { n: 40, k: 15, correct: 95, trap: 35 },
        { n: 50, k: 20, correct: 120, trap: 45 },
        { n: 24, k: 6, correct: 54, trap: 18 }
      ];
      const p = pickOne(rng, numbers);
      return {
        id: 'divide_by_half',
        categoryAr: 'فخ حسابي مخادع ➗',
        promptAr: `اقسم العدد ${p.n} على نصف (أي على 0.5)، ثم أضف إليه ${p.k}. ما هو الناتج النهائي؟`,
        correctAnswer: `${p.correct}`,
        trapAnswer: `${p.trap}`,
        distractors: [`${p.n + p.k}`, `${p.n * 2}`],
        explanationAr: `القسمة على نصف (0.5) تعني الضرب في 2! ${p.n} ÷ 0.5 = ${p.n * 2}، وبإضافة ${p.k} يصبح الناتج ${p.correct}!`
      };
    }
  },

  // 6. Matchstick in the Dark Room (عود الثقاب في الغرفة الباردة)
  {
    id: 'matchstick_in_dark',
    categoryAr: 'لغز ترتيب الأولويات 🔥',
    minStage: 1,
    generate: () => {
      return {
        id: 'matchstick_in_dark',
        categoryAr: 'لغز ترتيب الأولويات 🔥',
        promptAr: 'دخلت غرفة باردة ومظلمة وبيدك عود ثقاب واحد فقط. تحتوي الغرفة على: مصباح كاز، وشمعة، ومدفأة حطب. ماذا ستشعل أولاً؟',
        correctAnswer: 'عود الثقاب أولاً',
        trapAnswer: 'الشمعة',
        distractors: ['مصباح الكاز', 'مدفأة الحطب'],
        explanationAr: 'مستحيل إشعال الشمعة أو المصباح أو المدفأة بدون إشعال عود الثقاب الذي بيدك أولاً!'
      };
    }
  },

  // 7. Sheep Survivors (الخراف المتبقية)
  {
    id: 'sheep_survivors',
    categoryAr: 'فخ الصياغة والتركيز 🐑',
    minStage: 1,
    generate: (rng) => {
      const totals = [17, 19, 21, 23, 25];
      let total = pickOne(rng, totals);
      const survivors = 7 + Math.floor(rng.next() * 4); // 7 to 10
      if (total === survivors * 2) {
        total += 1;
      }
      const dead = total - survivors;
      const d2 = dead + 2 === total ? dead + 3 : dead + 2;

      return {
        id: 'sheep_survivors',
        categoryAr: 'فخ الصياغة والتركيز 🐑',
        promptAr: `مزارع لديه ${total} خروفاً في الحقل. ماتت كلها إلا ${survivors}. كم خروفاً بقي على قيد الحياة؟`,
        correctAnswer: `${survivors} خراف`,
        trapAnswer: `${dead} خراف`,
        distractors: [`${total} خروف`, `${d2} خروفاً`],
        explanationAr: `نص اللغز صريح: «ماتت كلها إلا ${survivors}»، أي أن الذين نجوا وبقوا أحياء هم الـ ${survivors} أنفسهم!`
      };
    }
  },

  // 8. Rope Ladder on Ship & Rising Tide (سلم السفينة والمد البحري)
  {
    id: 'rope_ship_tide',
    categoryAr: 'فيزياء ومنطق بديهي ⚓',
    minStage: 1,
    generate: (rng) => {
      const rises = [60, 90, 120];
      const rise = pickOne(rng, rises);
      const steps = rise / 30;

      return {
        id: 'rope_ship_tide',
        categoryAr: 'فيزياء ومنطق بديهي ⚓',
        promptAr: `سلم حبال معلق على جانب سفينة راسية، والمسافة بين كل درجة 30 سم، والماء يلامس الدرجة السفلية. إذا ارتفع مد البحر بمقدار ${rise} سم، كم درجة إضافية سيغطيها الماء؟`,
        correctAnswer: 'لا درجة إضافية',
        trapAnswer: `${steps} درجات`,
        distractors: ['درجة واحدة فقط', 'جميع الدرجات'],
        explanationAr: 'السفينة تطفو فوق سطح الماء وترتفع تلقائياً مع صعود المد، وبالتالي يبقى منسوب الماء عند نفس الدرجة!'
      };
    }
  },

  // 9. Brothers and Sisters (الإخوة والأخوات)
  {
    id: 'brothers_and_sisters',
    categoryAr: 'علاقات أسرية ومنطق 👨‍👩‍👧‍👦',
    minStage: 1,
    generate: (rng) => {
      const brothersCount = 3 + Math.floor(rng.next() * 4); // 3 to 6
      const totalKids = brothersCount + 1;

      return {
        id: 'brothers_and_sisters',
        categoryAr: 'علاقات أسرية ومنطق 👨‍👩‍👧‍👦',
        promptAr: `في أسرة معينة، لدى كل واحد من الإخوة الذكور الـ ${brothersCount} أخت واحدة فقط. كم هو إجمالي عدد الأبناء والبنات في هذه الأسرة؟`,
        correctAnswer: `${totalKids} أطفال`,
        trapAnswer: `${brothersCount * 2} أطفال`,
        distractors: [`${totalKids + 2} أطفال`, `${brothersCount} أطفال`],
        explanationAr: `الأخت الواحدة مشتركة بين جميع الإخوة الـ ${brothersCount}، إذن إجمالي الأطفال هو ${brothersCount} ذكور + أنثى واحدة = ${totalKids} أطفال!`
      };
    }
  },

  // 10. Brick Weight (وزن قالب الطوب)
  {
    id: 'brick_weight',
    categoryAr: 'معادلة بديهية مخادعة 🧱',
    minStage: 1,
    generate: (rng) => {
      const wList = [1, 2, 3, 4];
      const w = pickOne(rng, wList);
      const totalWeight = w * 2;
      const trapWeight = w * 1.5;

      return {
        id: 'brick_weight',
        categoryAr: 'معادلة بديهية مخادعة 🧱',
        promptAr: `قالب طوب يزن ${w} كجم ونصف قالب طوب. فكم يزن قالب الطوب كاملاً؟`,
        correctAnswer: `${totalWeight} كجم`,
        trapAnswer: `${trapWeight} كجم`,
        distractors: [`${w} كجم`, `${totalWeight + 2} كجم`],
        explanationAr: `إذا كان القالب = ${w} كجم + نصف قالب، فهذا يعني أن النصف الآخر = ${w} كجم، إذن وزن القالب كاملاً = ${totalWeight} كجم!`
      };
    }
  },

  // 11. Doctor's Pills Prescription (حبات الدواء)
  {
    id: 'doctor_pills',
    categoryAr: 'حساب زمني مخادع 💊',
    minStage: 2,
    generate: (rng) => {
      const pillConfigs = [
        { count: 3, intervalHours: 1, correct: 2, trap: 3 },
        { count: 4, intervalHours: 1, correct: 3, trap: 4 },
        { count: 3, intervalHours: 2, correct: 4, trap: 6 },
        { count: 5, intervalHours: 1, correct: 4, trap: 5 },
        { count: 4, intervalHours: 2, correct: 6, trap: 8 }
      ];
      const cfg = pickOne(rng, pillConfigs);
      return {
        id: 'doctor_pills',
        categoryAr: 'حساب زمني مخادع 💊',
        promptAr: `وصف لك الطبيب ${cfg.count} حبات دواء، بحيث تأخذ حبة واحدة كل ${cfg.intervalHours === 1 ? 'ساعة' : `${cfg.intervalHours} ساعات`}. كم ساعة يستغرق تناول جميع الحبات؟`,
        correctAnswer: `${cfg.correct} ساعات`,
        trapAnswer: `${cfg.trap} ساعات`,
        distractors: [`${cfg.correct + 1} ساعات`, `${cfg.trap + 1} ساعات`],
        explanationAr: `الحبة الأولى تؤخذ في البداية فوراً (الساعة 0)، إذن المدة الفعلية هي ${cfg.correct} ساعات فقط!`
      };
    }
  },

  // 12. Clock Chimes Intervals (دقات ساعة الحائط والفترات)
  {
    id: 'clock_chimes',
    categoryAr: 'فترات زمنية وأجراس ⏰',
    minStage: 2,
    generate: (rng) => {
      const configs = [
        { c1: 6, t1: 5, c2: 12, correct: 11, trap: 10 },
        { c1: 4, t1: 3, c2: 8, correct: 7, trap: 6 },
        { c1: 5, t1: 4, c2: 10, correct: 9, trap: 8 }
      ];
      const cfg = pickOne(rng, configs);
      return {
        id: 'clock_chimes',
        categoryAr: 'فترات زمنية وأجراس ⏰',
        promptAr: `ساعة حائط تدق ${cfg.c1} دقات في ${cfg.t1} ثوانٍ. كم ثانية تستغرق لتدق ${cfg.c2} دقة؟`,
        correctAnswer: `${cfg.correct} ثانية`,
        trapAnswer: `${cfg.trap} ثوانٍ`,
        distractors: [`${cfg.correct + 2} ثانية`, `${cfg.t1 * 2} ثوانٍ`],
        explanationAr: `الفترات الفاصلة بين الدقات هي التي تستغرق وقتاً: ${cfg.c1} دقات بينها ${cfg.c1 - 1} فترات، إذن ${cfg.c2} دقة بينها ${cfg.c2 - 1} فترات وتستغرق ${cfg.correct} ثانية!`
      };
    }
  },

  // 13. Cutting Wood Intervals (قص ألواح الخشب)
  {
    id: 'cutting_wood_intervals',
    categoryAr: 'فواصل وعمليات قطع 🪵',
    minStage: 2,
    generate: (rng) => {
      const configs = [
        { mins: 3, pieces: 4, cuts: 3, correct: 9, trap: 12 },
        { mins: 4, pieces: 5, cuts: 4, correct: 16, trap: 20 },
        { mins: 2, pieces: 6, cuts: 5, correct: 10, trap: 12 }
      ];
      const cfg = pickOne(rng, configs);
      return {
        id: 'cutting_wood_intervals',
        categoryAr: 'فواصل وعمليات قطع 🪵',
        promptAr: `نجار يستغرق ${cfg.mins} دقائق لقص لوح خشب إلى قطعتين (قصة واحدة). كم دقيقة يستغرق لقص نفس اللوح إلى ${cfg.pieces} قطع متساوية؟`,
        correctAnswer: `${cfg.correct} دقيقة`,
        trapAnswer: `${cfg.trap} دقيقة`,
        distractors: [`${cfg.correct + cfg.mins} دقيقة`, `${cfg.pieces * 2} دقيقة`],
        explanationAr: `لتقسيم اللوح إلى ${cfg.pieces} قطع تحتاج إلى ${cfg.cuts} قصات فقط، ${cfg.cuts} × ${cfg.mins} = ${cfg.correct} دقيقة!`
      };
    }
  },

  // 14. Peacock's Egg Boundary (بيضة الطاووس على الحدود)
  {
    id: 'peacock_egg',
    categoryAr: 'فخ الطبيعة والأحياء 🦚',
    minStage: 2,
    generate: (rng) => {
      const [name1, name2] = pickDistinct(rng, LIBYAN_MALE_NAMES, 2);
      return {
        id: 'peacock_egg',
        categoryAr: 'فخ الطبيعة والأحياء 🦚',
        promptAr: `طاووس يقف على السور الفاصل بين منزل ${name1} ومنزل ${name2}، باض بيضة سقطت في المنتصف تماماً. لمن تعود ملكية البيضة قانونياً؟`,
        correctAnswer: 'الطاووس ذكر لا يبيض أصلاً',
        trapAnswer: 'تقسم مناصفة بين الجارين',
        distractors: [`لمنزل ${name1}`, `لمنزل ${name2}`],
        explanationAr: 'الطاووس هو ذكر طائر الطاووس ولا يبيض أبداً، بل أنثاه (دجاجة الطاووس) هي التي تبيض!'
      };
    }
  },

  // 15. Electric Train Smoke (دخان القطار الكهربائي)
  {
    id: 'electric_train_smoke',
    categoryAr: 'فيزياء ومعطيات زائدة 🚄',
    minStage: 3,
    generate: () => {
      return {
        id: 'electric_train_smoke',
        categoryAr: 'فيزياء ومعطيات زائدة 🚄',
        promptAr: 'قطار كهربائي حديث يسير بسرعة 120 كم/س نحو الشمال، والرياح تهب بقوة نحو الشرق. إلى أي اتجاه يتطاير دخان القطار؟',
        correctAnswer: 'القطار الكهربائي لا يصدر دخاناً',
        trapAnswer: 'نحو الجنوب الشرقي',
        distractors: ['نحو الشرق', 'نحو الجنوب'],
        explanationAr: 'القطار يعمل بالطاقة الكهربائية النظيفة ولا يوجد له أي دخان ليتطاير أصلاً!'
      };
    }
  },

  // 16. Kilo of Iron vs Kilo of Feathers (كيلوغرام الحديد والقطن)
  {
    id: 'heavy_kilo',
    categoryAr: 'كتلة وأوزان بديهية ⚖️',
    minStage: 3,
    generate: () => {
      return {
        id: 'heavy_kilo',
        categoryAr: 'كتلة وأوزان بديهية ⚖️',
        promptAr: 'أيهما أثقل وزناً: كيلوغرام من قطع الحديد الصلب، أم كيلوغرام من ريش الطيور والقطن؟',
        correctAnswer: 'كلاهما متساويان في الوزن تماماً',
        trapAnswer: 'كيلوغرام الحديد أثقل',
        distractors: ['كيلوغرام الريش أثقل', 'يعتمد على المكان'],
        explanationAr: 'كلاهما يزن «1 كيلوغرام» بالضبط! الحديد أكثر كثافة وأصغر حجماً لكن الوزن متطابق!'
      };
    }
  },

  // ----------------------------------------------------
  // GROUP 2: Races, Positions & Movement (Stages 4-6)
  // ----------------------------------------------------

  // 17. Runner in a Race (تجاوز المركز الثاني)
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
      const p = pickOne(rng, positions);
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

  // 18. Overtaking the Last Runner (تجاوز المتسابق الأخير)
  {
    id: 'race_last_place',
    categoryAr: 'مفارقة منطقية 🏁',
    minStage: 5,
    generate: (rng) => {
      const types = ['سباق للجري', 'سباق دراجات هوائية', 'ماراثون دولي', 'سباق سيارات'];
      const t = pickOne(rng, types);
      return {
        id: 'race_last_place',
        categoryAr: 'مفارقة منطقية 🏁',
        promptAr: `في ${t}، تجاوزت أنت المتسابق الأخير في الترتيب. ما هو مركزك الآن؟`,
        correctAnswer: 'مستحيل منطقياً',
        trapAnswer: 'المركز قبل الأخير',
        distractors: ['المركز الأخير', 'المركز الأول'],
        explanationAr: 'مستحيل منطقياً أن تتجاوز المتسابق الأخير! لأنك لو كنت خلفه لما كان هو الأخير أصلاً!'
      };
    }
  },

  // 19. Elevator Floors Climbed (طوابق المصعد)
  {
    id: 'elevator_floors',
    categoryAr: 'مسافات وطوابق 🛗',
    minStage: 5,
    generate: (rng) => {
      const f1 = 2 + Math.floor(rng.next() * 3); // 2 to 4
      const f2 = f1 + 3 + Math.floor(rng.next() * 3); // f1 + 3 to f1 + 5
      const climbed = f2 - f1;

      return {
        id: 'elevator_floors',
        categoryAr: 'مسافات وطوابق 🛗',
        promptAr: `ركبت المصعد من الطابق ${f1} وصعدت حتى وصلت إلى الطابق ${f2}. كم طابقاً قطعه المصعد في هذه الرحلة؟`,
        correctAnswer: `${climbed} طوابق`,
        trapAnswer: `${f2} طوابق`,
        distractors: [`${climbed + 1} طوابق`, `${climbed - 1} طوابق`],
        explanationAr: `الفارق بين الطابقين هو ${f2} - ${f1} = ${climbed} طوابق! الفخ هو عدّ الطوابق الإجمالية أو تضمين طابق البداية مرتين!`
      };
    }
  },

  // 20. Two Trains Meeting Distance (القطاران المتقابلان والمسافة)
  {
    id: 'two_trains_distance',
    categoryAr: 'سرعة ونقاط لقاء 🚆',
    minStage: 5,
    generate: (rng) => {
      const cities = pickDistinct(rng, LIBYAN_CITIES, 2);
      const c1 = cities[0]!;
      const c2 = cities[1]!;
      const s1 = 80 + Math.floor(rng.next() * 40);
      const s2 = 130 + Math.floor(rng.next() * 40);

      return {
        id: 'two_trains_distance',
        categoryAr: 'سرعة ونقاط لقاء 🚆',
        promptAr: `انطلق قطار من ${c1} نحو ${c2} بسرعة ${s1} كم/س، وقطار أسرع انطلق من ${c2} نحو ${c1} بسرعة ${s2} كم/س. عند لحظة التقائهما على السكة، أيهما أقرب إلى مدينة ${c1}؟`,
        correctAnswer: `كلاهما على نفس المسافة تماماً من ${c1}`,
        trapAnswer: `القطار الأسرع القادم من ${c2}`,
        distractors: [`قطار مدينة ${c1}`, 'يعتمد على طول المسافة'],
        explanationAr: `طالما التقيا في نفس النقطة على السكة، فهما حتماً على نفس المسافة بالضبط من أي نقطة على الخريطة!`
      };
    }
  },

  // 21. Circular Race Track Laps (مضمار السباق الدائري)
  {
    id: 'circular_race_laps',
    categoryAr: 'سباق ودورات دائرية 🏎️',
    minStage: 5,
    generate: (rng) => {
      const name = pickOne(rng, LIBYAN_MALE_NAMES);
      return {
        id: 'circular_race_laps',
        categoryAr: 'سباق ودورات دائرية 🏎️',
        promptAr: `في مضمار سباق دائري، تجاوز المتسابق ${name} السيارة التي أمامه بدورة كاملة. كم دورة أصبح الفارق بينهما الآن؟`,
        correctAnswer: 'دورة واحدة كاملة',
        trapAnswer: 'دورتان كاملتان',
        distractors: ['نصف دورة', 'لا يوجد فارق'],
        explanationAr: 'التجاوز بدورة كاملة يعني فقط أنه تقدم عليه بدورة واحدة، ولا يضاعف عدد الدورات!'
      };
    }
  },

  // 22. Stairs Round Trip (النزول والصعود في الدرج)
  {
    id: 'stairs_round_trip',
    categoryAr: 'حساب مسافات الحركة 🪜',
    minStage: 6,
    generate: (rng) => {
      const topFloor = 4 + Math.floor(rng.next() * 3); // 4 to 6
      const floorsPerTrip = topFloor - 1;
      const total = floorsPerTrip * 2;

      return {
        id: 'stairs_round_trip',
        categoryAr: 'حساب مسافات الحركة 🪜',
        promptAr: `نزلت على الدرج من شقتك في الطابق ${topFloor} إلى الطابق الأرضي (الأول)، ثم صعدت مجدداً إلى شقتك في الطابق ${topFloor}. كم طابقاً قطعت ذهاباً وإياباً؟`,
        correctAnswer: `${total} طوابق`,
        trapAnswer: `${topFloor * 2} طوابق`,
        distractors: [`${total + 1} طوابق`, `${floorsPerTrip} طوابق`],
        explanationAr: `من الطابق ${topFloor} إلى الطابق 1 الفارق هو ${floorsPerTrip} طوابق، ذهاباً وإياباً: ${floorsPerTrip} + ${floorsPerTrip} = ${total} طوابق!`
      };
    }
  },

  // ----------------------------------------------------
  // GROUP 3: Rates, Work & Doubling (Stages 7-11)
  // ----------------------------------------------------

  // 23. Machines and Production Rate (الآلات ومعدل الإنتاج)
  {
    id: 'machines_rate',
    categoryAr: 'زمن ومعدلات ⏱️',
    minStage: 7,
    generate: (rng) => {
      const configs = [
        { m1: 5, i1: 5, mins: 5, m2: 100, i2: 100, trap: '100 دقيقة' },
        { m1: 3, i1: 3, mins: 3, m2: 60, i2: 60, trap: '60 دقيقة' },
        { m1: 4, i1: 4, mins: 4, m2: 40, i2: 40, trap: '40 دقيقة' },
        { m1: 6, i1: 6, mins: 6, m2: 120, i2: 120, trap: '120 دقيقة' }
      ];
      const c = pickOne(rng, configs);
      return {
        id: 'machines_rate',
        categoryAr: 'زمن ومعدلات ⏱️',
        promptAr: `إذا كانت ${c.m1} آلات تستغرق ${c.mins} دقائق لصنع ${c.i1} قطع، فكم دقيقة تستغرق ${c.m2} آلة لصنع ${c.i2} قطعة من نفس النوع؟`,
        correctAnswer: `${c.mins} دقائق`,
        trapAnswer: c.trap,
        distractors: [`${c.mins * 2} دقائق`, 'دقيقة واحدة'],
        explanationAr: `الآلة الواحدة تستغرق ${c.mins} دقائق لصنع قطعة واحدة، لذلك ${c.m2} آلة تعمل متوازية وتصنع ${c.i2} قطعة في نفس الـ ${c.mins} دقائق!`
      };
    }
  },

  // 24. Cats Catching Mice Rate (القطط والفئران)
  {
    id: 'cats_and_mice',
    categoryAr: 'معدلات إنتاج وتوازي 🐱',
    minStage: 7,
    generate: (rng) => {
      const configs = [
        { cats: 3, mice: 3, mins: 3, targetMice: 100, targetMins: 100, trap: '100 قطة' },
        { cats: 5, mice: 5, mins: 5, targetMice: 50, targetMins: 50, trap: '50 قطة' },
        { cats: 2, mice: 2, mins: 2, targetMice: 80, targetMins: 80, trap: '80 قطة' }
      ];
      const c = pickOne(rng, configs);
      return {
        id: 'cats_and_mice',
        categoryAr: 'معدلات إنتاج وتوازي 🐱',
        promptAr: `إذا كانت ${c.cats} قطط تصيد ${c.mice} فئران في ${c.mins} دقائق، فكم قطة تلزم لصيد ${c.targetMice} فأراً في ${c.targetMins} دقيقة؟`,
        correctAnswer: `${c.cats} قطط`,
        trapAnswer: c.trap,
        distractors: [`${c.cats * 2} قطط`, 'قطة واحدة'],
        explanationAr: `كل قطة تصيد فأراً واحداً كل ${c.mins} دقائق. في ${c.targetMins} دقيقة، نفس الـ ${c.cats} قطط ستصيد ${c.targetMice} فأراً بكل سهولة!`
      };
    }
  },

  // 25. Snail Climbing a Well (الحلزون في البئر)
  {
    id: 'snail_in_well',
    categoryAr: 'حساب زمني وانزلاق 🐌',
    minStage: 8,
    generate: (rng) => {
      const configs = [
        { depth: 10, up: 3, down: 2, correctDay: 8, trapDay: 10 },
        { depth: 12, up: 4, down: 2, correctDay: 5, trapDay: 6 },
        { depth: 8, up: 3, down: 1, correctDay: 4, trapDay: 4 }
      ];
      const c = pickOne(rng, configs);
      return {
        id: 'snail_in_well',
        categoryAr: 'حساب زمني وانزلاق 🐌',
        promptAr: `حلزون في قاع بئر عمقها ${c.depth} أمتار، يصعد كل يوم ${c.up} أمتار في النهار، وينزلق ${c.down} مترين في الليل. في أي يوم يصل إلى قمة البئر ويخرج منها؟`,
        correctAnswer: `في اليوم ${c.correctDay}`,
        trapAnswer: `في اليوم ${c.trapDay}`,
        distractors: [`في اليوم ${c.correctDay + 2}`, `في اليوم ${c.correctDay - 1}`],
        explanationAr: `في نهار اليوم ${c.correctDay} يصل إلى قمة البئر (${c.depth} أمتار) ويخرج فوراً قبل أن يحل الليل وينزلق!`
      };
    }
  },

  // 26. Water Lily Doubling in Lake (تضاعف زنبق الماء)
  {
    id: 'lily_doubling',
    categoryAr: 'نمو أسي وتضاعف 🌊',
    minStage: 9,
    generate: (rng) => {
      const days = pickOne(rng, [20, 30, 48, 60]);
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

  // 27. Bacteria Colony Doubling (تضاعف مستعمرة البكتيريا)
  {
    id: 'bacterial_culture_doubling',
    categoryAr: 'نمو أسي وبيولوجيا 🧫',
    minStage: 9,
    generate: (rng) => {
      const hours = pickOne(rng, [12, 16, 24, 48]);
      const halfHour = Math.floor(hours / 2);
      const correctHour = hours - 1;

      return {
        id: 'bacterial_culture_doubling',
        categoryAr: 'نمو أسي وبيولوجيا 🧫',
        promptAr: `مستعمرة بكتيريا يتضاعف عددها كل ساعة، وملأت أنبوب الاختبار بالكامل في ${hours} ساعة. متى كانت المستعمرة تملأ ربع الأنبوب (25%) فقط؟`,
        correctAnswer: `بعد ${hours - 2} ساعة`,
        trapAnswer: `بعد ${Math.floor(hours / 4)} ساعات`,
        distractors: [`بعد ${halfHour} ساعة`, `بعد ${correctHour} ساعة`],
        explanationAr: `إذا كانت تملأ الأنبوب عند ${hours}، فنصفه كان عند ${hours - 1}، وربعه كان عند ${hours - 2} ساعة فقط!`
      };
    }
  },

  // 28. Two Painters Work (دهان الغرف والعمال)
  {
    id: 'two_painters_speed',
    categoryAr: 'تناسب ومعدل عمل 🎨',
    minStage: 10,
    generate: () => {
      return {
        id: 'two_painters_speed',
        categoryAr: 'تناسب ومعدل عمل 🎨',
        promptAr: 'عاملان يدهنان غرفتين متطابقتين في يومين. كم عاملاً نحتاج لدهان 10 غرف متطابقة في 10 أيام؟',
        correctAnswer: 'عاملان فقط',
        trapAnswer: '10 عمال',
        distractors: ['5 عمال', '4 عمال'],
        explanationAr: 'العامل الواحد يدهن غرفة واحدة كل يومين؛ لذا فإن نفس العاملين سيدهنان 10 غرف في 10 أيام بالتمام والكمال!'
      };
    }
  },

  // ----------------------------------------------------
  // GROUP 4: Ages, Family & Kinship (Stages 12-14)
  // ----------------------------------------------------

  // 29. Age Constant Difference (فارق العمر الثابت)
  {
    id: 'age_difference',
    categoryAr: 'أعمار وعلاقات 🎂',
    minStage: 12,
    generate: (rng) => {
      const brotherName = pickOne(rng, LIBYAN_MALE_NAMES);
      const configs = [
        { agePast: 6, ageNow: 40, diff: 3, trap: 20 },
        { agePast: 8, ageNow: 50, diff: 4, trap: 25 },
        { agePast: 10, ageNow: 60, diff: 5, trap: 30 },
        { agePast: 4, ageNow: 30, diff: 2, trap: 15 }
      ];
      const c = pickOne(rng, configs);
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

  // 30. Father & Son Portrait Riddle (صورة الرجل الغامض)
  {
    id: 'father_and_son_portrait',
    categoryAr: 'صلة قرابة واستدلال 🖼️',
    minStage: 12,
    generate: (rng) => {
      const name = pickOne(rng, LIBYAN_MALE_NAMES);
      return {
        id: 'father_and_son_portrait',
        categoryAr: 'صلة قرابة واستدلال 🖼️',
        promptAr: `ينظر ${name} إلى صورة شخص معلقة ويقول: «ليس لدي أي إخوة، ولكن والد هذا الشخص في الصورة هو ابن أبي». من هو الشخص الموجود في الصورة؟`,
        correctAnswer: `ابن ${name}`,
        trapAnswer: `${name} نفسه`,
        distractors: [`والد ${name}`, `ابن عم ${name}`],
        explanationAr: `بما أنه ليس لديه إخوة، فإن «ابن أبي» هو ${name} نفسه! ووالد الشخص في الصورة هو ${name}، إذن الشخص في الصورة هو ابنه!`
      };
    }
  },

  // 31. Two Fathers and Two Sons (اثنان من الآباء واثنان من الأبناء)
  {
    id: 'two_fathers_two_sons',
    categoryAr: 'ألغاز قرابة كلاسيكية 🎣',
    minStage: 12,
    generate: () => {
      return {
        id: 'two_fathers_two_sons',
        categoryAr: 'ألغاز قرابة كلاسيكية 🎣',
        promptAr: 'خرج اثنان من الآباء واثنان من الأبناء في رحلة صيد، واصطادوا 3 سمكات بالضبط. أخذ كل شخص منهم سمكة كاملة دون تقطيع! كيف ذلك؟',
        correctAnswer: 'هم 3 أجيال (جد، وأب، وحفيد)',
        trapAnswer: 'سقطت سمكة رابعة في القارب',
        distractors: ['أحدهم لم يأكل سمكته', 'المسألة مستحيلة حسابياً'],
        explanationAr: 'هم ثلاثة أشخاص فقط: الجد (أب)، والأب (ابن الجد وأب الحفيد)، والحفيد (ابن)! فالمجموع اثنان من الآباء واثنان من الأبناء!'
      };
    }
  },

  // 32. Midnight Crossing Birthdays (تاريخ ميلاد التوأمين)
  {
    id: 'mother_daughters_midnight',
    categoryAr: 'مفارقات التقويم والزمن 🌓',
    minStage: 13,
    generate: (rng) => {
      const [n1, n2] = pickDistinct(rng, LIBYAN_FEMALE_NAMES, 2);
      return {
        id: 'mother_daughters_midnight',
        categoryAr: 'مفارقات التقويم والزمن 🌓',
        promptAr: `ولدت الأختان التوأم (${n1} و${n2}) في نفس الليلة بفارق 15 دقيقة فقط، ومع ذلك يحتفلان بعيد ميلادهما في يومين وسنتين مختلفتين تماماً! كيف ذلك؟`,
        correctAnswer: 'ولدت الأولى قبل منتصف ليلة رأس السنة والثانية بعدها',
        trapAnswer: 'بسبب اختلاف التوقيت الصيفي',
        distractors: ['خطأ في شهادة الميلاد', 'ولدت إحداهما على متن طائرة'],
        explanationAr: 'ولدت الأولى في 31 ديسمبر قبل منتصف الليل، وولدت الثانية في 1 يناير من السنة الجديدة!'
      };
    }
  },

  // ----------------------------------------------------
  // GROUP 5: Truth-Tellers & Liars (Stages 15-20)
  // ----------------------------------------------------

  // 33. Truth-Teller & Liar - Fork in Road (مفترق الطرق)
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

  // 34. Both Liars Statement Paradox (مفارقة الصادق والكاذب)
  {
    id: 'liar_statement_paradox',
    categoryAr: 'منطق البوابات 🎭',
    minStage: 16,
    generate: (rng) => {
      const [name1, name2] = pickDistinct(rng, LIBYAN_MALE_NAMES, 2);
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

  // 35. Gold & Silver Boxes (صندوقا الذهب والفضة)
  {
    id: 'two_boxes_gold_silver',
    categoryAr: 'صناديق ومنطق شرطي 📦',
    minStage: 17,
    generate: () => {
      return {
        id: 'two_boxes_gold_silver',
        categoryAr: 'صناديق ومنطق شرطي 📦',
        promptAr: 'صندوقان (ذهبي وفضي)، في أحدهما مفتاح الكنز. كُتب على الذهبي: «المفتاح ليس هنا»، وكُتب على الفضي: «عبارة واحدة فقط من هاتين العبارتين صحيحة». أين المفتاح؟',
        correctAnswer: 'في الصندوق الذهبي',
        trapAnswer: 'في الصندوق الفضي',
        distractors: ['في كلا الصندوقين', 'المفتاح غير موجود أصلاً'],
        explanationAr: 'لو كانت عبارة الفضي كاذبة لتناقضت مع نفسها! إذن عبارة الفضي صادقة، وبالتالي عبارة الذهبي كاذبة، مما يعني أن المفتاح في الذهبي!'
      };
    }
  },

  // 36. Are You a Truth-Teller Question (سؤال جزيرة الفرسان)
  {
    id: 'are_you_truth_teller',
    categoryAr: 'استدلال منطقي حتمي 🏝️',
    minStage: 18,
    generate: (rng) => {
      const name = pickOne(rng, LIBYAN_MALE_NAMES);
      return {
        id: 'are_you_truth_teller',
        categoryAr: 'استدلال منطقي حتمي 🏝️',
        promptAr: `في جزيرة كل سكانها إما صادقون دائماً أو كاذبون دائماً، قابلت المواطن ${name} وسألته: «هل أنت صادق؟». ماذا سيكون رده عليك حتماً؟`,
        correctAnswer: 'سيقول «نعم» في كلتا الحالتين',
        trapAnswer: 'سيقول نعم لو صادق ولا لو كاذب',
        distractors: ['سيقول «لا» حتماً', 'لن يجيبك بشيء'],
        explanationAr: 'الصادق سيقول الصدق ويجيب «نعم»، والكاذب سيكذب ويدعي أنه صادق فيجيب «نعم» أيضاً! فالجواب «نعم» حتمي في الحالتين!'
      };
    }
  },

  // ----------------------------------------------------
  // GROUP 6: Probability & Pigeonhole in the Dark (Stages 21-25)
  // ----------------------------------------------------

  // 37. Socks in the Dark - 2 Colors (سحب الجوارب في الظلام - لونان)
  {
    id: 'socks_in_dark_2colors',
    categoryAr: 'يقين واحتمالات 🧦',
    minStage: 21,
    generate: (rng) => {
      const black = 10 + Math.floor(rng.next() * 5); // 10 to 14
      const white = 10 + Math.floor(rng.next() * 5); // 10 to 14
      const half = Math.floor((black + white) / 2);
      return {
        id: 'socks_in_dark_2colors',
        categoryAr: 'يقين واحتمالات 🧦',
        promptAr: `في خزانة مظلمة يوجد ${black} جوارب سوداء و${white} جوارب بيضاء مخلوطة. ما هو أقل عدد جوارب تسحبها عشوائياً لضمان زوج من نفس اللون حتماً؟`,
        correctAnswer: '3 جوارب',
        trapAnswer: `${black + 1} جوارب`,
        distractors: [`${half} جوارب`, '2 جوارب'],
        explanationAr: 'يوجد لونان فقط (أسود وأبيض)؛ أسوأ احتمال أن تسحب جورباً أسود وجورباً أبيض، والجورب الثالث سيطابق أحدهما حتماً!'
      };
    }
  },

  // 38. Socks in the Dark - 3 Colors (سحب الجوارب - ثلاثة ألوان)
  {
    id: 'socks_in_dark_3colors',
    categoryAr: 'مبدأ برج الحمام 🧦',
    minStage: 22,
    generate: (rng) => {
      const count = 10 + Math.floor(rng.next() * 5);
      return {
        id: 'socks_in_dark_3colors',
        categoryAr: 'مبدأ برج الحمام 🧦',
        promptAr: `درج مظلم فيه ${count} جوارب حمراء، و${count} زرقاء، و${count} خضراء. ما هو أقل عدد تسحبه في الظلام لضمان الحصول على زوج من نفس اللون حتماً؟`,
        correctAnswer: '4 جوارب',
        trapAnswer: `${count + 1} جوارب`,
        distractors: ['3 جوارب', `${count * 2} جوارب`],
        explanationAr: 'يوجد 3 ألوان؛ أسوأ سيناريو هو سحب جورب واحد من كل لون (3 جوارب)، فالجورب الرابع سيطابق أحد الألوان حتماً!'
      };
    }
  },

  // 39. Socks to Guarantee a Specific Color (ضمان لون محدد في أسوأ سيناريو)
  {
    id: 'socks_guarantee_specific_color',
    categoryAr: 'أسوأ الاحتمالات واليقين 🧦',
    minStage: 23,
    generate: (rng) => {
      const black = 8 + Math.floor(rng.next() * 4); // 8 to 11
      const white = 12 + Math.floor(rng.next() * 4); // 12 to 15
      const worstCase = white + 2;

      return {
        id: 'socks_guarantee_specific_color',
        categoryAr: 'أسوأ الاحتمالات واليقين 🧦',
        promptAr: `في درج مظلم ${black} جوارب سوداء و${white} جوارب بيضاء. كم جورباً تسحبه لضمان الحصول على زوج أسود تحديداً في أسوأ احتمال؟`,
        correctAnswer: `${worstCase} جورباً`,
        trapAnswer: '3 جوارب',
        distractors: [`${white + 1} جورباً`, `${black + 2} جورباً`],
        explanationAr: `في أسوأ سيناريو قد تسحب كل الجوارب البيضاء (${white}) أولاً، لذا تحتاج لسحب ${white} + 2 لضمان زوج أسود 100%!`
      };
    }
  },

  // 40. Fruit Boxes with Wrong Labels (صناديق الفاكهة والملصقات الخاطئة)
  {
    id: 'fruit_boxes_mislabelled',
    categoryAr: 'استبعاد منطقي حتمي 📦',
    minStage: 24,
    generate: () => {
      return {
        id: 'fruit_boxes_mislabelled',
        categoryAr: 'استبعاد منطقي حتمي 📦',
        promptAr: 'ثلاثة صناديق فواكه مغلقة تحمل ملصقات خاطئة 100%: (تفاح)، (برتقال)، (تفاح وبرتقال). كم حبة تسحب ومن أي صندوق لتعرف محتويات الصناديق الثلاثة فوراً؟',
        correctAnswer: 'حبة واحدة من صندوق (تفاح وبرتقال)',
        trapAnswer: '3 حبات (حبة من كل صندوق)',
        distractors: ['حبتان من صندوق التفاح', 'مستحيل معرفة ذلك'],
        explanationAr: 'صندوق (تفاح وبرتقال) يحمل ملصقاً خاطئاً، إذن هو يحوي نوعاً واحداً خالصاً، وبمعرفة هذا النوع تنكشف باقي الصناديق حتماً!'
      };
    }
  },

  // ----------------------------------------------------
  // GROUP 7: Ordering, Height & Elimination (Stages 26-35)
  // ----------------------------------------------------

  // 41. Ordering & Height Elimination (ترتيب واستبعاد الأطوال)
  {
    id: 'ordering_height',
    categoryAr: 'ترتيب واستبعاد 📏',
    minStage: 26,
    generate: (rng) => {
      const [n1, n2, n3] = pickDistinct(rng, LIBYAN_MALE_NAMES, 3);
      // n1 > n3 > n2
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

  // 42. Ordering & Weight Elimination (ترتيب الأوزان)
  {
    id: 'ordering_weight',
    categoryAr: 'مقارنات وأوزان ⚖️',
    minStage: 28,
    generate: (rng) => {
      const [n1, n2, n3] = pickDistinct(rng, LIBYAN_MALE_NAMES, 3);
      // n1 > n2 > n3
      return {
        id: 'ordering_weight',
        categoryAr: 'مقارنات وأوزان ⚖️',
        promptAr: `${n1} أثقل من ${n2}، و${n3} أخف من ${n2}. من هو الشخص الأثقل بينهم جميعاً؟`,
        correctAnswer: n1,
        trapAnswer: n2,
        distractors: [n3, 'جميعهم متساوون'],
        explanationAr: `الترتيب من الأثقل للأخف: ${n1} أثقل من ${n2}، و${n2} أثقل من ${n3}، إذن الأثقل حتماً هو ${n1}!`
      };
    }
  },

  // 43. Race Finish Sequence (ترتيب الوصول في السباق)
  {
    id: 'race_finish_ordering',
    categoryAr: 'ترتيب سباق وشروط 🏁',
    minStage: 30,
    generate: (rng) => {
      const [a, b, c, d] = pickDistinct(rng, LIBYAN_MALE_NAMES, 4);
      // Sequence: d > c > a > b
      return {
        id: 'race_finish_ordering',
        categoryAr: 'ترتيب سباق وشروط 🏁',
        promptAr: `في سباق 4 متسابقين: وصل ${a} قبل ${b} ولكن بعد ${c}. وكان ${d} قد وصل قبل ${c}. من هو الفائز بالمركز الأول؟`,
        correctAnswer: d,
        trapAnswer: c,
        distractors: [a, b],
        explanationAr: `بترتيب الوصول: ${d} وصل قبل ${c}، و${c} قبل ${a}، و${a} قبل ${b}. إذن الفائز بالمركز الأول هو ${d}!`
      };
    }
  },

  // 44. Three Cards Positions (ترتيب البطاقات الملونة)
  {
    id: 'three_cards_colors',
    categoryAr: 'استدلال موضعي 🃏',
    minStage: 32,
    generate: () => {
      return {
        id: 'three_cards_colors',
        categoryAr: 'استدلال موضعي 🃏',
        promptAr: 'ثلاث بطاقات (حمراء وزرقاء وخضراء) موضوعة في صف. الحمراء على يسار الخضراء، والزرقاء على يمين الخضراء. ما هي البطاقة الموجودة في المنتصف؟',
        correctAnswer: 'البطاقة الخضراء',
        trapAnswer: 'البطاقة الحمراء',
        distractors: ['البطاقة الزرقاء', 'لا يمكن التحديد'],
        explanationAr: 'الحمراء يسار الخضراء، والزرقاء يمينها؛ هذا يجعل البطاقة الخضراء في الوسط تماماً بينهما!'
      };
    }
  },

  // ----------------------------------------------------
  // GROUP 8: 3-Person Logic & Knights/Knaves (Stages 36-45)
  // ----------------------------------------------------

  // 45. Three Persons Truth - One is Truthful (صادق واحد من ثلاثة)
  {
    id: 'three_persons_truth',
    categoryAr: 'الصادق والكاذب 👥',
    minStage: 36,
    generate: (rng) => {
      const [a, b, c] = pickDistinct(rng, LIBYAN_MALE_NAMES, 3);
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

  // 46. Three Persons - One Liar (كاذب واحد فقط بين ثلاثة)
  {
    id: 'three_persons_one_liar',
    categoryAr: 'كشف الكاذب الوحيد 🎭',
    minStage: 38,
    generate: (rng) => {
      const [a, b, c] = pickDistinct(rng, LIBYAN_MALE_NAMES, 3);
      return {
        id: 'three_persons_one_liar',
        categoryAr: 'كشف الكاذب الوحيد 🎭',
        promptAr: `ثلاثة أشخاص (${a}، ${b}، ${c})، اثنان منهم صادقان دائماً وواحد فقط كاذب دائماً. قال ${a}: «${b} صادق»، وقال ${b}: «${c} كاذب». من هو الكاذب الوحيد؟`,
        correctAnswer: c,
        trapAnswer: b,
        distractors: [a, 'لا يوجد كاذب'],
        explanationAr: `بما أن هناك كاذباً واحداً فقط، لو كان ${b} كاذباً لكان ${a} كاذباً أيضاً (لأنه يزكيه) وهذا تناقض! إذن ${a} و${b} صادقان، والكاذب هو ${c}!`
      };
    }
  },

  // 47. Who Broke the Window (من كسر النافذة؟)
  {
    id: 'who_broke_window',
    categoryAr: 'تحقيق واستدلال جنائي 🔍',
    minStage: 40,
    generate: (rng) => {
      const [a, b, c, d] = pickDistinct(rng, LIBYAN_MALE_NAMES, 4);
      return {
        id: 'who_broke_window',
        categoryAr: 'تحقيق واستدلال جنائي 🔍',
        promptAr: `كُسرت نافذة، وأحد الأربعة (${a}، ${b}، ${c}، ${d}) هو الفاعل. واحد منهم فقط صادق في قوله: قال ${a}: «${b} هو الفاعل»، قال ${b}: «${d} هو الفاعل»، قال ${c}: «أنا لست الفاعل»، قال ${d}: «${b} يكذب». من كسر النافذة؟`,
        correctAnswer: c,
        trapAnswer: b,
        distractors: [a, d],
        explanationAr: `بين تصريح ${b} وتصريح ${d} تناقض مباشر، لذا أحدهما الصادق الوحيد! بالتالي تصريح ${c} كاذب حتماً، وبما أنه قال (لست الفاعل) وهو كاذب، إذن ${c} هو الفاعل!`
      };
    }
  },

  // ----------------------------------------------------
  // GROUP 9: Logic Grids & Advanced Combinations (Stages 46+)
  // ----------------------------------------------------

  // 48. Logic Grid 3 Elements x Attributes (جدول منطقي للسيارات والمدن)
  {
    id: 'logic_grid_attributes',
    categoryAr: 'جداول منطقية متقاطعة 📋',
    minStage: 46,
    generate: (rng) => {
      const names = pickDistinct(rng, LIBYAN_MALE_NAMES, 3);
      const colors = ['حمراء', 'زرقاء', 'بيضاء'];

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

  // 49. Logic Grid Houses & Professions (المنازل والمهن)
  {
    id: 'logic_grid_professions',
    categoryAr: 'شبكات استنتاج واستبعاد 🏡',
    minStage: 50,
    generate: (rng) => {
      const names = pickDistinct(rng, LIBYAN_MALE_NAMES, 3);
      const jobs = ['مهندس', 'طبيب', 'معلم'];

      return {
        id: 'logic_grid_professions',
        categoryAr: 'شبكات استنتاج واستبعاد 🏡',
        promptAr: `يسكن (${names[0]}، ${names[1]}، ${names[2]}) في 3 بيوت متجاورة. مهنهم هي (${jobs[0]}، ${jobs[1]}، ${jobs[2]}). إذا كان ${names[0]} ليس ${jobs[1]}، و${names[2]} هو الـ ${jobs[0]}، فما هي مهنة ${names[0]}؟`,
        correctAnswer: jobs[2],
        trapAnswer: jobs[1],
        distractors: [jobs[0], 'محامي'],
        explanationAr: `${names[2]} هو ${jobs[0]}، و${names[0]} ليس ${jobs[1]}، إذن لابد أن يكون ${names[0]} هو ${jobs[2]}!`
      };
    }
  },

  // 50. Race Track Laps & Overtaking (دورات المضمار والمفارقة)
  {
    id: 'race_laps_overtaking',
    categoryAr: 'سرعة ودورات 🏎️',
    minStage: 56,
    generate: (rng) => {
      const name = pickOne(rng, LIBYAN_MALE_NAMES);
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
  },

  // 51. Double Negation Statement (نفي النفي والمنطق المركب)
  {
    id: 'double_negation_statement',
    categoryAr: 'منطق عبارات مركب ⚡',
    minStage: 60,
    generate: (rng) => {
      const name = pickOne(rng, LIBYAN_MALE_NAMES);
      return {
        id: 'double_negation_statement',
        categoryAr: 'منطق عبارات مركب ⚡',
        promptAr: `إذا قال القاضي: «ليس صحيحاً أن ${name} لم يكن غير بريء من التهمة». فما هو الموقف القانوني لـ ${name}؟`,
        correctAnswer: 'مذنب (غير بريء)',
        trapAnswer: 'بريء تماماً',
        distractors: ['القضية معلقة', 'لا توجد أدلة كافية'],
        explanationAr: 'نفي النفي إثبات: «غير بريء» = مذنب. «لم يكن غير بريء» = كان بريئاً. «ليس صحيحاً أنه كان بريئاً» = هو مذنب!'
      };
    }
  }
];
