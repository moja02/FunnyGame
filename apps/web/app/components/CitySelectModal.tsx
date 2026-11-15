'use client';

import React, { useState, useMemo } from 'react';
import {
  LIBYA_CITIES,
  LIBYA_REGIONS,
  type LibyaCity,
  type LibyaRegion,
  searchLibyaCities,
  getNearestLibyaCity,
  normalizeLibyaSearchText,
} from '@funnygame/game-core';

interface CitySelectModalProps {
  isOpen: boolean;
  currentCityId?: string;
  onSelectCity: (city: LibyaCity) => Promise<{ success: boolean; error?: string; daysRemaining?: number }>;
  onClose: () => void;
}

export const CitySelectModal: React.FC<CitySelectModalProps> = ({
  isOpen,
  currentCityId,
  onSelectCity,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<'all' | LibyaRegion>('all');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered cities list
  const filteredCities = useMemo(() => {
    return searchLibyaCities(searchQuery, selectedRegion);
  }, [searchQuery, selectedRegion]);

  if (!isOpen) return null;

  const handleCityPick = async (city: LibyaCity) => {
    if (city.id === currentCityId) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await onSelectCity(city);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(`تم! توّا إنت تمثل ${city.name_ar} في الترتيب 💪`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleGpsLocate = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsFeedback('ميزة تحديد الموقع غير مدعومة في متصفحك');
      return;
    }

    setIsLocating(true);
    setGpsFeedback('جاري قراءة إحداثيات موقعك...');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const { city, distanceKm } = getNearestLibyaCity(latitude, longitude);
        setGpsFeedback(`تم رصد موقعك: أقرب مدينة هي ${city.name_ar} (على بعد ~${distanceKm} كم)`);
        handleCityPick(city);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        setGpsFeedback('تعذر قراءة الموقع، يرجى اختيار مدينتك من القائمة يدوياً');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-400/50 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-start justify-between bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-1.5">
              <span>من أي مدينة تلعب؟</span>
              <span>🌍</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              اختار مدينتك باش تنافس ولاد بلادك وترفع اسمها في الصدارة!
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center text-sm font-black transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Notices */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs text-rose-200 font-bold leading-relaxed">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 font-bold text-center">
            {successMessage}
          </div>
        )}

        {/* Search & GPS Tool */}
        <div className="p-3 border-b border-white/10 flex flex-col gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مدينتك أو منطقتك (مثلاً: جنزور، الصابري...)"
              className="w-full px-3.5 py-2 pl-9 bg-black/50 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Region Filters */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none py-0.5">
              <button
                onClick={() => setSelectedRegion('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap transition-all ${
                  selectedRegion === 'all'
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                الكل ({LIBYA_CITIES.length})
              </button>
              {(['west', 'east', 'south'] as LibyaRegion[]).map((r) => {
                const info = LIBYA_REGIONS[r];
                const count = LIBYA_CITIES.filter((c) => c.region === r).length;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRegion(r)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-black whitespace-nowrap transition-all ${
                      selectedRegion === r
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{info.badge}</span>
                    <span className="mr-1">{info.name_ar}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* GPS Match Button */}
            <button
              onClick={handleGpsLocate}
              disabled={isLocating}
              title="تحديد المدينة تلقائياً حسب الموقع"
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold whitespace-nowrap flex items-center gap-1 active:scale-95 transition-all"
            >
              <span>📍</span>
              <span>{isLocating ? '...' : 'تحديد بموقعي'}</span>
            </button>
          </div>

          {gpsFeedback && (
            <div className="text-[10px] text-cyan-300 bg-cyan-950/30 px-2 py-1 rounded-lg border border-cyan-500/20">
              {gpsFeedback}
            </div>
          )}
        </div>

        {/* Cities Grid List */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 max-h-[380px]">
          {filteredCities.length === 0 ? (
            <div className="col-span-2 text-center py-10 text-xs text-slate-400">
              لم نعثر على مدينة بهذا الاسم 🔍
            </div>
          ) : (
            filteredCities.map((city) => {
              const isSelected = city.id === currentCityId;
              const regionBadge = LIBYA_REGIONS[city.region].badge;

              // Check if query matched one of the aliases
              const matchedAlias = searchQuery
                ? city.aliases.find((a) =>
                    normalizeLibyaSearchText(a).includes(normalizeLibyaSearchText(searchQuery))
                  )
                : null;

              return (
                <button
                  key={city.id}
                  disabled={isSubmitting}
                  onClick={() => handleCityPick(city)}
                  className={`p-2.5 rounded-2xl text-right flex flex-col justify-between transition-all active:scale-95 border ${
                    isSelected
                      ? 'bg-amber-400/20 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-black text-white flex items-center gap-1">
                      <span>{city.name_ar}</span>
                      {isSelected && <span className="text-amber-400">✔</span>}
                    </span>
                    <span className="text-xs">{regionBadge}</span>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>{city.name_en}</span>
                    <span className="text-[9px] text-slate-500">{LIBYA_REGIONS[city.region].name_ar}</span>
                  </div>

                  {matchedAlias && (
                    <div className="text-[9px] text-amber-300/80 bg-amber-400/10 px-1 py-0.5 rounded mt-1 truncate">
                      يشمل: {matchedAlias}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-2.5 border-t border-white/10 bg-black/40 text-center text-[10px] text-slate-400">
          💡 يمكنك تغيير مدينتك مرة واحدة كل 30 يوماً للحفاظ على نزاهة المنافسة.
        </div>
      </div>
    </div>
  );
};
