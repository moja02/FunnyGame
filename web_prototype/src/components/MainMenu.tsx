import React from 'react';
import { Users, Bot, Zap, Trophy, Sparkles, Flame, Eye, Shuffle, Calculator } from 'lucide-react';
import { sound } from '../utils/sound';
import { GameMode, BotDifficulty } from '../types';

interface MainMenuProps {
  onStartDuel: (mode: GameMode, difficulty?: BotDifficulty) => void;
  bestRecord: number | null;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartDuel, bestRecord }) => {
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<BotDifficulty>('medium');

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-5 flex flex-col items-center justify-between" style={{
      background: 'radial-gradient(ellipse at top, #231245 0%, #0d071a 100%)'
    }}>
      {/* Top Banner / Logo */}
      <div className="text-center my-3 pop-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2" style={{
          background: 'rgba(254, 202, 87, 0.15)',
          border: '1px solid rgba(254, 202, 87, 0.4)',
          color: '#feca57',
          fontSize: '0.85rem',
          fontWeight: 700
        }}>
          <Sparkles size={14} />
          <span>ألعاب التحدي والسرعة للجوال</span>
        </div>

        <h1 style={{
          fontSize: '2.8rem',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #ff9ff3 0%, #feca57 50%, #48dbfb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.1,
          letterSpacing: '-1px',
          textShadow: '0 10px 30px rgba(255, 107, 129, 0.3)'
        }}>
          FunnyGame
        </h1>
        <p style={{ color: '#c8d6e5', fontSize: '0.95rem', marginTop: '4px' }}>
          سرعة بديهة • ذكاء • تركيز خارق 🔥
        </p>
      </div>

      {/* Flagship Game: لعبة الفارق الزمني */}
      <div className="w-full max-w-sm rounded-3xl p-5 my-2 pop-in" style={{
        background: 'linear-gradient(145deg, #2b1854 0%, #170c30 100%)',
        border: '2px solid rgba(254, 202, 87, 0.4)',
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.6rem' }}>⏱️</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                لعبة الفارق الزمني
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#feca57', fontWeight: 700 }}>
                اللعبة الأساسية • تحدي الـ 0.00 ثانية
              </span>
            </div>
          </div>
          <span className="badge-score" style={{ background: 'rgba(255, 71, 87, 0.2)', color: '#ff6b81' }}>
            <Flame size={14} /> حماسي
          </span>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#c8d6e5', marginBottom: '14px', lineHeight: 1.4 }}>
          أوقف العداد عند التوقيت المطلوب بالضبط في مواجهة مباشرة وجهاً لوجه على نفس الشاشة!
        </p>

        {/* 2-Player Split Screen Button */}
        <button
          onClick={() => {
            sound.playTap();
            onStartDuel('pvp');
          }}
          className="arcade-btn w-full mb-3"
          style={{
            background: 'linear-gradient(135deg, #ff4757 0%, #ff6b81 100%)',
            padding: '14px 18px',
            color: 'white',
            fontSize: '1.1rem',
            boxShadow: '0 6px 0 #b32e3b, 0 10px 20px rgba(255, 71, 87, 0.4)'
          }}
        >
          <Users size={22} />
          <span>تحدي شخصين (نفس الجوال) ⚔️</span>
        </button>

        {/* Solo vs Bot */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.85rem', color: '#a4b0be', fontWeight: 700 }}>
              أو العب بمفردك ضد الروبوت:
            </span>
            <div className="flex gap-1">
              {(['easy', 'medium', 'hard'] as BotDifficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => {
                    sound.playTap();
                    setSelectedDifficulty(diff);
                  }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedDifficulty === diff ? '#54a0ff' : 'rgba(255,255,255,0.08)',
                    color: selectedDifficulty === diff ? '#000' : '#888'
                  }}
                >
                  {diff === 'easy' ? 'سهل' : diff === 'medium' ? 'متوسط' : 'مستحيل'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              sound.playTap();
              onStartDuel('bot', selectedDifficulty);
            }}
            className="arcade-btn w-full"
            style={{
              background: 'linear-gradient(135deg, #0abde3 0%, #10ac84 100%)',
              padding: '11px 16px',
              color: 'white',
              fontSize: '0.95rem',
              boxShadow: '0 4px 0 #008f90'
            }}
          >
            <Bot size={18} />
            <span>تدريب فردي (ضد الروبوت) 🤖</span>
          </button>
        </div>
      </div>

      {/* Best Record Badge */}
      {bestRecord !== null && (
        <div className="my-2 px-4 py-2 rounded-2xl flex items-center gap-2" style={{
          background: 'rgba(254, 202, 87, 0.1)',
          border: '1px solid rgba(254, 202, 87, 0.3)',
          color: '#feca57'
        }}>
          <Trophy size={18} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            أفضل رقم قياسي لك: فارق <strong className="digital-font text-white">{bestRecord.toFixed(3)} ث</strong> فقط!
          </span>
        </div>
      )}

      {/* Upcoming Mini Games Showcase */}
      <div className="w-full max-w-sm mt-2 mb-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#8395a7' }}>
            ألعاب ممتعة قادمة في FunnyGame:
          </span>
          <span style={{ fontSize: '0.7rem', color: '#576574' }}>توسعة قادمة</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-2.5 flex items-center gap-2" style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(255, 71, 87, 0.15)', color: '#ff6b81' }}>
              <Eye size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#eee' }}>فخ الألوان</div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>سرعة بديهة</div>
            </div>
          </div>

          <div className="rounded-2xl p-2.5 flex items-center gap-2" style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(0, 210, 211, 0.15)', color: '#48dbfb' }}>
              <Shuffle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#eee' }}>تتبع الكؤوس</div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>قوة التركيز</div>
            </div>
          </div>

          <div className="rounded-2xl p-2.5 flex items-center gap-2" style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(254, 202, 87, 0.15)', color: '#feca57' }}>
              <Calculator size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#eee' }}>حساب البرق</div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>ذكاء ومنطق</div>
            </div>
          </div>

          <div className="rounded-2xl p-2.5 flex items-center gap-2" style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div className="p-2 rounded-xl" style={{ background: 'rgba(165, 94, 234, 0.15)', color: '#a55eea' }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#eee' }}>اصطد السريع</div>
              <div style={{ fontSize: '0.65rem', color: '#888' }}>رد فعل خاطف</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
