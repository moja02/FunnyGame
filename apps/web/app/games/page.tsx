'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '../components/BottomNav';

interface GameItem {
  id: string;
  title: string;
  ability: 'speed' | 'math' | 'memory' | 'logic';
  abilityName: string;
  icon: string;
  description: string;
  status: 'ready' | 'soon';
  stages: string;
}

const allGames: GameItem[] = [
  // 1. السرعة والتركيز
  {
    id: 'color-trap',
    title: 'ألوان خادعة',
    ability: 'speed',
    abilityName: 'السرعة والتركيز',
    icon: '🎨',
    description: 'اكبح ردة فعلك التلقائية واضغط الزر حسب المطلوب قبل ما ينفد الوقت!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'dont-tap',
    title: 'لا تضغط!',
    ability: 'speed',
    abilityName: 'السرعة والتركيز',
    icon: '🛑',
    description: 'أشكال تتساقط عبر 3 مسارات. اضغط على المطلوب بس، وسيّب الباقي ينزل!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'moving-target',
    title: 'الهدف المتحرك',
    ability: 'speed',
    abilityName: 'السرعة والتركيز',
    icon: '🎯',
    description: 'التقط الأهداف السريعة في اللحظة المناسبة تماماً قبل اختفائها.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'odd-one-out',
    title: 'الدخيل',
    ability: 'speed',
    abilityName: 'السرعة والتركيز',
    icon: '👁️',
    description: 'امسح الشبكة بسرعة واكتشف الرمز أو اللون الدخيل قبل ما ينفد الوقت!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'hawk-eye',
    title: 'عين الصقر',
    ability: 'speed',
    abilityName: 'السرعة والتركيز',
    icon: '🦅',
    description: 'ردة فعل بصرية خاطفة لرصد العنصر المختلف في جزء من الثانية.',
    status: 'soon',
    stages: '70+ مرحلة'
  },

  // 2. الحساب والبديهة
  {
    id: 'calc-pressure',
    title: 'حاسبة تحت الضغط',
    ability: 'math',
    abilityName: 'الحساب والبديهة',
    icon: '🧮',
    description: 'عمليات حسابية متراكمة تحت ضغط الوقت، احفظ الناتج وكمل عليه قبل ما ينتهي الوقت!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'math-bridge',
    title: 'الجسر الحسابي',
    ability: 'math',
    abilityName: 'الحساب والبديهة',
    icon: '🌉',
    description: 'معادلات رياضية ناقصة! اختر العملية أو الرقم المجهول وأكمل المعادلة قبل نفاد الوقت.',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'number-hunt',
    title: 'صيد الرقم',
    ability: 'math',
    abilityName: 'الحساب والبديهة',
    icon: '🎯',
    description: 'ادمج بطاقات الأرقام بالعمليات الحسابية وصيد الرقم الهدف قبل نفاد الوقت!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'speed-math',
    title: 'حساب سريع',
    ability: 'math',
    abilityName: 'الحساب والبديهة',
    icon: '⏱️',
    description: 'معادلات حسابية خاطفة تحت ضغط الوقت مع فخاخ ذكية.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'greater-less',
    title: 'أكبر وأصغر',
    ability: 'math',
    abilityName: 'الحساب والبديهة',
    icon: '➕',
    description: 'مقارنات سريعة بين قيم حسابية متغيرة بدون وقت للتفكير الطويل.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'number-balance',
    title: 'ميزان الأرقام',
    ability: 'math',
    abilityName: 'الحساب والبديهة',
    icon: '⚖️',
    description: 'وازن بين الكفتين باختيار الأرقام المكملة قبل نفاد العداد.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'inverted-eq',
    title: 'معادلة مقلوبة',
    ability: 'math',
    abilityName: 'الحساب والبديهة',
    icon: '🔄',
    description: 'اكتشف العملية الحسابية الصحيحة التي تعطي الناتج المعروض.',
    status: 'soon',
    stages: '70+ مرحلة'
  },

  // 3. الذاكرة والاستدعاء
  {
    id: 'where-did-it-go',
    title: 'أين اختفت؟',
    ability: 'memory',
    abilityName: 'الذاكرة والاستدعاء',
    icon: '🔍',
    description: 'احفظ أماكن الصور قبل ما تنقلب البطاقات وتتبدل أماكنها، وافتح المطلوب بالترتيب!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'follow-pattern',
    title: 'اتبع النمط',
    ability: 'memory',
    abilityName: 'الذاكرة والاستدعاء',
    icon: '🧩',
    description: 'احفظ تسلسل إضاءة ونغمات الأزرار وعيدها بالترتيب أو بالعكس وبدون غلطة!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'watch-and-judge',
    title: 'شاهد واحكم',
    ability: 'memory',
    abilityName: 'الذاكرة والاستدعاء',
    icon: '👁️',
    description: 'احفظ تفاصيل المشهد الأول، واكتشف ما الذي تغير في المشهد الثاني أو اضغط ما في تغيير!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'matrix-memory',
    title: 'مصفوفة الذاكرة',
    ability: 'memory',
    abilityName: 'الذاكرة والاستدعاء',
    icon: '🔲',
    description: 'تذكر أماكن المربعات المضيئة وأعد فتحها بدقة بدون غلطة.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'number-sequence',
    title: 'تسلسل الأرقام',
    ability: 'memory',
    abilityName: 'الذاكرة والاستدعاء',
    icon: '🔢',
    description: 'احفظ تسلسل الأرقام المومضة وأعد إدخالها بالترتيب الصحيح.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'matching-pairs',
    title: 'أزواج متطابقة',
    ability: 'memory',
    abilityName: 'الذاكرة والاستدعاء',
    icon: '🃏',
    description: 'اكشف البطاقات وتذكر مواقع الأزواج المتشابهة بأقل حركات ممكنة.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'maze-path',
    title: 'مسار المتاهة',
    ability: 'memory',
    abilityName: 'الذاكرة والاستدعاء',
    icon: '🗺️',
    description: 'احفظ المسار الآمن خلال ثوانٍ معدودة قبل أن تختفي المعالم.',
    status: 'soon',
    stages: '70+ مرحلة'
  },

  // 4. الذكاء والمنطق
  {
    id: 'moving-maze',
    title: 'متاهة تتحرك',
    ability: 'logic',
    abilityName: 'الذكاء والمنطق',
    icon: '🧭',
    description: 'تنقل في المتاهة المتغيرة بذكاء، تفادَ الفخاخ واجمع المفاتيح واصل للمخرج.',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'tile-match',
    title: 'مطابقة الطبقات',
    ability: 'logic',
    abilityName: 'الذكاء والمنطق',
    icon: '🍓',
    description: 'انقل البطاقات المكشوفة وطابق 3 فواكه في الشريط السفلي لتفريغ الطبقات ومسح اللوحة.',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'smart-trap',
    title: 'الفخ الذكي',
    ability: 'logic',
    abilityName: 'الذكاء والمنطق',
    icon: '🪤',
    description: 'أجب على الألغاز المنطقية الاستنباطية واكبح الاستجابة البديهية المتسرعة لتفادي الفخ!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'complete-sequence',
    title: 'أكمل المتتالية',
    ability: 'logic',
    abilityName: 'الذكاء والمنطق',
    icon: '🔢',
    description: 'اكتشف القاعدة المنطقية بين العناصر (أرقام أو أشكال) واختر المكمل الناقص قبل نفاد الوقت!',
    status: 'ready',
    stages: '70+ مرحلة'
  },
  {
    id: 'heaviest-lightest',
    title: 'الأثقل والأخف',
    ability: 'logic',
    abilityName: 'الذكاء والمنطق',
    icon: '⚖️',
    description: 'استنتج الوزن النسبي للأشكال عبر موازين بصرية متداخلة.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'missing-pattern',
    title: 'النمط الناقص',
    ability: 'logic',
    abilityName: 'الذكاء والمنطق',
    icon: '🧩',
    description: 'اكتشف القاعدة المنطقية للشكل واكمل النمط الناقص.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'compass-direction',
    title: 'اتجاه البوصلة',
    ability: 'logic',
    abilityName: 'الذكاء والمنطق',
    icon: '🧭',
    description: 'حدد الاتجاه الحقيقي بسرعة بعد عدة دورانات منطقية متتالية.',
    status: 'soon',
    stages: '70+ مرحلة'
  },
  {
    id: 'logic-anomaly',
    title: 'العنصر الدخيل',
    ability: 'logic',
    abilityName: 'الذكاء والمنطق',
    icon: '🔍',
    description: 'استخرج العنصر الذي لا يخضع لنفس القاعدة المنطقية للبقية.',
    status: 'soon',
    stages: '70+ مرحلة'
  }
];

export default function GamesPage() {
  const [selectedAbility, setSelectedAbility] = useState<'all' | 'speed' | 'math' | 'memory' | 'logic'>('all');

  const filteredGames = selectedAbility === 'all'
    ? allGames
    : allGames.filter((g) => g.ability === selectedAbility);

  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-24 max-w-[480px] w-full mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1">
          <span>◀</span>
          <span>الرئيسية</span>
        </Link>
        <h1 className="font-heading text-xl font-black text-amber-400">مكتبة الألعاب 🎮</h1>
        <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-white">
          16 لعبة
        </div>
      </header>

      {/* Ability Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
        <button
          onClick={() => setSelectedAbility('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            selectedAbility === 'all'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 border border-white/10 hover:text-white'
          }`}
        >
          الكل (16)
        </button>
        <button
          onClick={() => setSelectedAbility('speed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            selectedAbility === 'speed'
              ? 'bg-rose-500 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 border border-white/10 hover:text-white'
          }`}
        >
          ⚡ السرعة (4)
        </button>
        <button
          onClick={() => setSelectedAbility('math')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            selectedAbility === 'math'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 border border-white/10 hover:text-white'
          }`}
        >
          🧮 الحساب (4)
        </button>
        <button
          onClick={() => setSelectedAbility('memory')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            selectedAbility === 'memory'
              ? 'bg-purple-500 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 border border-white/10 hover:text-white'
          }`}
        >
          🧠 الذاكرة (4)
        </button>
        <button
          onClick={() => setSelectedAbility('logic')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            selectedAbility === 'logic'
              ? 'bg-teal-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 border border-white/10 hover:text-white'
          }`}
        >
          💡 المنطق (4)
        </button>
      </div>

      {/* Games Grid */}
      <div className="flex flex-col gap-3">
        {filteredGames.map((game) => {
          const isReady = game.status === 'ready';

          return (
            <div
              key={game.id}
              className={`p-4 rounded-3xl border transition-all ${
                isReady
                  ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/30 border-rose-500/50 shadow-xl shadow-rose-950/30 ring-1 ring-rose-500/30'
                  : 'bg-slate-900/60 border-white/10 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-inner ${
                      isReady
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {game.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-base font-black text-white">{game.title}</h3>
                      {isReady && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                          متاحة الآن 🔥
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {game.abilityName} • {game.stages}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {game.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-[11px] font-bold text-amber-300/80">
                  {isReady ? 'تدرج صعوبة حتى المرحلة اللانهائية' : 'قيد التركيب والمعايرة ⏳'}
                </span>

                {isReady ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/leaderboard/${game.id}`}
                      className="px-3 py-2 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                    >
                      <span>🏆</span>
                      <span>الصدارة</span>
                    </Link>
                    <Link
                      href={`/play/${game.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black rounded-xl text-xs shadow-lg active:scale-95 transition-transform flex items-center gap-1.5"
                    >
                      <span>العب توا</span>
                      <span>⚡</span>
                    </Link>
                  </div>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold">
                    قريباً
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav />
    </main>
  );
}
