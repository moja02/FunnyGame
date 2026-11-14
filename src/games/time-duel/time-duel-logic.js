/**
 * TimeDuelLogic - Pure game mechanics for Time Difference Duel
 * Independent of DOM, purely testable and maintainable.
 */
export class TimeDuelLogic {
  constructor({
    targetTimes = [3.00, 4.00, 5.00, 5.50, 6.00, 7.00],
    winningScore = 3
  } = {}) {
    this.targetTimes = targetTimes;
    this.winningScore = winningScore;
    this.currentTarget = 5.00;
    this.p1Score = 0;
    this.p2Score = 0;
    this.round = 1;
  }

  reset() {
    this.p1Score = 0;
    this.p2Score = 0;
    this.round = 1;
    this.generateTarget();
  }

  generateTarget() {
    const idx = Math.floor(Math.random() * this.targetTimes.length);
    this.currentTarget = this.targetTimes[idx];
    return this.currentTarget;
  }

  evaluateStops(p1Time, p2Time) {
    const diff1 = Math.abs(p1Time - this.currentTarget);
    const diff2 = Math.abs(p2Time - this.currentTarget);

    let winner = 'tie';
    if (Math.abs(diff1 - diff2) < 0.005) {
      winner = 'tie';
    } else if (diff1 < diff2) {
      winner = 'p1';
      this.p1Score += 1;
    } else {
      winner = 'p2';
      this.p2Score += 1;
    }

    const isMatchOver = this.p1Score >= this.winningScore || this.p2Score >= this.winningScore;
    const matchWinner = this.p1Score >= this.winningScore ? 'p1' : (this.p2Score >= this.winningScore ? 'p2' : null);

    return {
      currentTarget: this.currentTarget,
      p1Time,
      p2Time,
      diff1,
      diff2,
      winner,
      p1Score: this.p1Score,
      p2Score: this.p2Score,
      round: this.round,
      isMatchOver,
      matchWinner
    };
  }

  nextRound() {
    this.round += 1;
    return this.generateTarget();
  }
}
