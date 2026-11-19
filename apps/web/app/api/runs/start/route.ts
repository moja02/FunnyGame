import { NextResponse } from 'next/server';
import { serverRegistry } from '@funnygame/game-core';
import '@funnygame/game-calc-pressure';
import '@funnygame/game-math-bridge';
import '@funnygame/game-number-hunt';
import '@funnygame/game-color-trap';
import '@funnygame/game-dont-tap';
import '@funnygame/game-odd-one-out';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { gameId, mode = 'free', userId } = body;

    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid gameId' }, { status: 400 });
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing userId for ranked play' }, { status: 400 });
    }

    // Verify game exists in server registry (or allow known registered game IDs)
    if (!serverRegistry.has(gameId) && gameId !== 'calc-pressure' && gameId !== 'calc_pressure' && gameId !== 'math-bridge' && gameId !== 'math_bridge' && gameId !== 'number-hunt' && gameId !== 'number_hunt' && gameId !== 'time-duel' && gameId !== 'speed-math' && gameId !== 'matrix-memory' && gameId !== 'color-trap' && gameId !== 'dont-tap' && gameId !== 'dont_tap' && gameId !== 'odd-one-out' && gameId !== 'odd_one_out') {
      return NextResponse.json({ error: `Game '${gameId}' is not registered` }, { status: 404 });
    }

    const supabase = getSupabaseServerClient();
    const today = new Date().toISOString().split('T')[0];

    // For Daily mode: verify user hasn't already submitted today
    if (mode === 'daily') {
      const { data: existingDaily } = await supabase
        .from('daily_submissions')
        .select('id')
        .eq('user_id', userId)
        .eq('challenge_date', today)
        .maybeSingle();

      if (existingDaily) {
        return NextResponse.json(
          { error: 'لقد استهلكت محاولتك في التحدي اليومي بالفعل!' },
          { status: 403 }
        );
      }
    }

    // Generate deterministic seed (32-bit positive integer)
    const seed = Math.floor(Math.random() * 2147483647) + 1;
    const startedAt = Date.now();

    // Create pending run record in Supabase
    const { data: runRecord, error: runError } = await supabase
      .from('game_runs')
      .insert({
        user_id: userId,
        game_id: gameId,
        mode,
        seed,
        score: 0,
        stage_reached: 1,
        is_suspicious: false,
        validated: true,
        started_at: new Date(startedAt).toISOString(),
        submitted_at: new Date(startedAt).toISOString(),
      })
      .select('id')
      .single();

    if (runError) {
      console.error('Supabase run creation error:', runError);
      return NextResponse.json({ error: 'Failed to initiate game session' }, { status: 500 });
    }

    return NextResponse.json({
      runId: runRecord.id,
      seed,
      gameId,
      mode,
      startedAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
