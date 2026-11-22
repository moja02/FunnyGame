import Link from 'next/link';
import { BottomNav } from '../components/BottomNav';

export default function LeaguePage() {
  return (
    <main className="flex-1 flex flex-col p-4 select-none pb-20">
      {/* Header */}
      <header className="flex items-center justify-between py-2 border-b border-white/10 mb-4">
        <Link href="/" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1">
          <span>◀</span>
          <span>الرئيسية</span>
        </Link>
        <h1 className="font-heading text-xl font-black text-amber-400">الدوري الأسبوعي ⚔️</h1>
        <div className="w-12" />
      </header>

      {/* League Maintenance Banner */}
      <div className="p-6 bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border-2 border-purple-500/40 rounded-3xl mb-5 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-3xl mb-4 animate-bounce">
          🛠️
        </div>

        <div className="inline-block px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-black mb-3">
          تحت الصيانة والتطوير
        </div>

        <h2 className="text-xl font-black text-white mb-2">الدوري الأسبوعي تحت الصيانة</h2>
        <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed mb-4">
          يتم حالياً تطوير نظام المجموعات (30 لاعباً) وجدولة التصفيات وصعود وهبوط الدوريات تلقائياً. سنعلن عن انطلاق أول موسم للدوري قريباً بإذن الله!
        </p>

        <div className="p-3 bg-black/40 border border-white/10 rounded-2xl max-w-xs mx-auto text-xs text-slate-400 font-bold mb-5">
          الحالة: مغلق للصيانة لحين إشعار آخر ⏳
        </div>

        <Link
          href="/games"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-transform active:scale-95"
        >
          <span>تصفح الألعاب المتاحة الآن (13 لعبة)</span>
          <span>◀</span>
        </Link>
      </div>

      {/* Status Notice */}
      <div className="p-4 bg-slate-900 border border-white/10 rounded-2xl text-center">
        <h3 className="text-sm font-black text-slate-200 mb-2 flex items-center justify-center gap-1.5">
          <span>📊</span>
          <span>لوحة ترتيب المجموعات</span>
        </h3>
        <div className="py-4 text-xs text-slate-400">
          سيتم فتح الصدارة الأسبوعية فور اكتمال أعمال الصيانة.
        </div>
      </div>

      {/* Bottom Sticky Navigation Bar */}
      <BottomNav />
    </main>
  );
}
