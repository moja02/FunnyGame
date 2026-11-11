import React from 'react';
import { Volume2, VolumeX, Smartphone, Monitor, ChevronRight } from 'lucide-react';
import { sound } from '../utils/sound';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  isSimulator: boolean;
  toggleSimulator: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  isSimulator,
  toggleSimulator,
  soundEnabled,
  setSoundEnabled
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    sound.enabled = next;
    setSoundEnabled(next);
    if (next) sound.playTap();
  };

  return (
    <header className="w-full px-4 py-2 flex items-center justify-between z-20 text-white" style={{
      background: 'rgba(15, 10, 28, 0.85)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
    }}>
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={() => {
              sound.playTap();
              onBack();
            }}
            className="arcade-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '6px 12px',
              borderRadius: '12px',
              fontSize: '0.85rem'
            }}
            title="الرجوع للقائمة"
          >
            <ChevronRight size={18} />
            <span>رجوع</span>
          </button>
        )}
        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#feca57' }}>
          {title || 'FunnyGame ⚡'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className="arcade-btn"
          style={{
            background: soundEnabled ? 'rgba(95, 39, 205, 0.3)' : 'rgba(255, 255, 255, 0.08)',
            padding: '8px',
            borderRadius: '12px',
            color: soundEnabled ? '#54a0ff' : '#888'
          }}
          title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* Desktop Mobile Frame Toggle */}
        <button
          onClick={toggleSimulator}
          className="arcade-btn hidden sm:flex"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '8px',
            borderRadius: '12px',
            color: '#c8d6e5'
          }}
          title={isSimulator ? 'ملء الشاشة' : 'وضع إطار الجوال'}
        >
          {isSimulator ? <Monitor size={18} /> : <Smartphone size={18} />}
        </button>
      </div>
    </header>
  );
};
