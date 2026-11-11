import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MainMenu } from './components/MainMenu';
import { TimeDuelGame } from './components/TimeDuelGame';
import { GameMode, BotDifficulty } from './types';
import { sound } from './utils/sound';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'duel'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [botDiff, setBotDiff] = useState<BotDifficulty>('medium');
  const [isSimulator, setIsSimulator] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [bestRecord, setBestRecord] = useState<number | null>(null);

  // Load saved high record and sound preferences
  useEffect(() => {
    const savedRecord = localStorage.getItem('funnygame_best_diff');
    if (savedRecord) {
      setBestRecord(parseFloat(savedRecord));
    }

    const savedSound = localStorage.getItem('funnygame_sound');
    if (savedSound !== null) {
      const isEnabled = savedSound === 'true';
      setSoundEnabled(isEnabled);
      sound.enabled = isEnabled;
    }
  }, []);

  // Update record if a new closer time is achieved
  const handleUpdateBestRecord = (newDiff: number) => {
    if (bestRecord === null || newDiff < bestRecord) {
      setBestRecord(newDiff);
      localStorage.setItem('funnygame_best_diff', newDiff.toString());
    }
  };

  // Start Time Duel
  const handleStartDuel = (mode: GameMode, difficulty: BotDifficulty = 'medium') => {
    setGameMode(mode);
    setBotDiff(difficulty);
    setCurrentScreen('duel');
  };

  // Back to Menu
  const handleBackToMenu = () => {
    setCurrentScreen('menu');
  };

  return (
    <div className={`app-container ${isSimulator ? 'simulator-mode' : 'screen-full'}`}>
      <Header
        title={currentScreen === 'duel' ? 'لعبة الفارق الزمني ⏱️' : 'FunnyGame ⚡'}
        onBack={currentScreen !== 'menu' ? handleBackToMenu : undefined}
        isSimulator={isSimulator}
        toggleSimulator={() => setIsSimulator(!isSimulator)}
        soundEnabled={soundEnabled}
        setSoundEnabled={(enabled) => {
          setSoundEnabled(enabled);
          localStorage.setItem('funnygame_sound', enabled.toString());
        }}
      />

      {currentScreen === 'menu' ? (
        <MainMenu
          onStartDuel={handleStartDuel}
          bestRecord={bestRecord}
        />
      ) : (
        <TimeDuelGame
          mode={gameMode}
          botDifficulty={botDiff}
          onUpdateBestRecord={handleUpdateBestRecord}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
};

export default App;
