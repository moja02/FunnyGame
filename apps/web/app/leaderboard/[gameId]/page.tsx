import LeaderboardClient from './LeaderboardClient';

export function generateStaticParams() {
  return [
    { gameId: 'calc-pressure' },
    { gameId: 'calc_pressure' },
    { gameId: 'math-bridge' },
    { gameId: 'math_bridge' },
    { gameId: 'color-trap' },
    { gameId: 'dont-tap' },
    { gameId: 'dont_tap' },
    { gameId: 'odd-one-out' },
    { gameId: 'odd_one_out' },
    { gameId: 'speed-math' },
    { gameId: 'matrix-memory' },
    { gameId: 'time-duel' }
  ];
}

interface LeaderboardPageProps {
  params: {
    gameId: string;
  };
}

export default function LeaderboardPage({ params }: LeaderboardPageProps) {
  return <LeaderboardClient gameId={params.gameId} />;
}
