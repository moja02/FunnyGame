import DuelClient from './DuelClient';

export function generateStaticParams() {
  return [
    { gameId: 'calc-pressure' },
    { gameId: 'calc_pressure' },
    { gameId: 'math-bridge' },
    { gameId: 'math_bridge' },
    { gameId: 'number-hunt' },
    { gameId: 'number_hunt' },
    { gameId: 'follow-pattern' },
    { gameId: 'follow_pattern' },
    { gameId: 'where-did-it-go' },
    { gameId: 'where_did_it_go' },
    { gameId: 'watch-and-judge' },
    { gameId: 'watch_and_judge' },
    { gameId: 'moving-maze' },
    { gameId: 'moving_maze' },
    { gameId: 'tile-match' },
    { gameId: 'tile_match' },
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
