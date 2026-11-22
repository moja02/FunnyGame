'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'الرئيسية', icon: '🏠' },
  { href: '/games', label: 'الألعاب', icon: '🎮', badge: '13' },
  { href: '/daily', label: 'اليومي', icon: '🎯' },
  { href: '/league', label: 'الدوري', icon: '🏆' },
  { href: '/profile', label: 'حسابي', icon: '👤' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] lg:max-w-6xl mx-auto bg-slate-950/95 backdrop-blur-md border-t border-white/10 px-2 py-2 flex items-center justify-around z-50 select-none">
      {navItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all relative ${
              isActive
                ? 'text-amber-400 font-black scale-105'
                : 'text-slate-400 hover:text-slate-200 font-bold'
            }`}
          >
            <span className="text-xl relative leading-none">
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full leading-tight">
                  {item.badge}
                </span>
              )}
            </span>
            <span className="text-[11px] tracking-tight">{item.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
