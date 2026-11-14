import DuelClient from './DuelClient';

export function generateStaticParams() {
  return [
    { gameId: 'color-trap' },
    { gameId: 'speed-math' },
    { gameId: 'matrix-memory' },
    { gameId: 'time-duel' }
  ];
}

interface DuelPageProps {
  params: {
    gameId: string;
  };
}

export default function DuelPage({ params }: DuelPageProps) {
  return <DuelClient gameId={params.gameId} />;
}
