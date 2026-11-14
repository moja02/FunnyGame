import LeaderboardClient from './LeaderboardClient';

export function generateStaticParams() {
  return [
    { gameId: 'color-trap' },
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
