import { NextResponse } from 'next/server';
import { serverRegistry, replayAndVerifyRun } from '@funnygame/game-core';
import type { RunSubmissionPayload } from '@funnygame/game-core';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const payload: RunSubmissionPayload = await req.json();
    const { runId, gameId, seed, answers, startedAt, submittedAt } = payload;

    if (!runId || !gameId || typeof seed !== 'number' || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Malformed run submission payload' }, { status: 400 });
    }

    const gameLogic = serverRegistry.get(gameId);
    if (!gameLogic) {
      return NextResponse.json({ error: `Game engine '${gameId}' not loaded on server` }, { status: 404 });
    }

    // 1. Execute deterministic server replay
    const verification = replayAndVerifyRun(gameLogic, {
      runId,
      gameId,
      seed,
      answers,
      startedAt,
      submittedAt: submittedAt || Date.now()
    });

    // 2. Persist verified run score in Supabase with service role
    const supabase = getSupabaseServerClient();
    const { error: updateError } = await supabase
      .from('game_runs')
      .update({
        score: verification.score,
        stage_reached: verification.stageReached,
        answers_json: answers,
        is_suspicious: verification.isSuspicious,
        validated: verification.isValid,
        submitted_at: new Date(submittedAt || Date.now()).toISOString()
      })
      .eq('id', runId);

    if (updateError) {
      console.error('Supabase run update error:', updateError);
    }

    return NextResponse.json({
      success: true,
      score: verification.score,
      stageReached: verification.stageReached,
      correctAnswers: verification.correctAnswersCount,
      isSuspicious: verification.isSuspicious,
      isValid: verification.isValid
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
