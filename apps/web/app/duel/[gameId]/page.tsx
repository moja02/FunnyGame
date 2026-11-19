import DuelClient from './DuelClient';

export function generateStaticParams() {
  return [
    { gameId: 'calc-pressure' },
    { gameId: 'calc_pressure' },
    { gameId: 'math-bridge' },
    { gameId: 'math_bridge' },
    { gameId: 'number-hunt' },
    { gameId: 'number_hunt' },
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

interface DuelPageProps {
  params: {
    gameId: string;
  };
}

export default function DuelPage({ params }: DuelPageProps) {
  return <DuelClient gameId={params.gameId} />;
}
