import DuelClient from './DuelClient';

export function generateStaticParams() {
  return [
    { gameId: 'color-trap' },
    { gameId: 'odd-one-out' },
    { gameId: 'odd_one_out' },
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
