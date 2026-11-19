import PlayClient from './PlayClient';

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

interface PlayPageProps {
  params: {
    gameId: string;
  };
}

export default function PlayPage({ params }: PlayPageProps) {
  return <PlayClient gameId={params.gameId} />;
}
