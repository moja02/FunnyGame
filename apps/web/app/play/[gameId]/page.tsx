import PlayClient from './PlayClient';

export function generateStaticParams() {
  return [
    { gameId: 'color-trap' },
    { gameId: 'speed-math' },
    { gameId: 'matrix-memory' },
    { gameId: 'time-duel' }
  ];
}

interface PlayPageProps {
  params: {
    gameId: string;
  };
}

export default function PlayPage({ params }: PlayPageProps) {
  return <PlayClient gameId={params.gameId} />;
}
