/**
 * Shared request budget for Strava.
 *
 * Strava allows 200 requests per 15 minutes and 2,000 per day. Stream backfills
 * are the only thing in this app that can realistically exhaust that, and being
 * rate-limited mid-backfill wastes the whole window — so the budget is enforced
 * here rather than reacting to 429s.
 */
export interface BudgetOptions {
  /** Requests per 15-minute window. Kept under Strava's 200 for headroom. */
  perWindow?: number;
  /** Requests per day. Kept under Strava's 2,000 for headroom. */
  perDay?: number;
  onWait?: (seconds: number, reason: string) => void;
}

const WINDOW_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export class RequestBudget {
  private readonly perWindow: number;
  private readonly perDay: number;
  private readonly onWait?: (seconds: number, reason: string) => void;
  private windowStart = Date.now();
  private windowCount = 0;
  private dayStart = Date.now();
  private dayCount = 0;

  constructor(options: BudgetOptions = {}) {
    this.perWindow = options.perWindow ?? 150;
    this.perDay = options.perDay ?? 1800;
    this.onWait = options.onWait;
  }

  get used(): { window: number; day: number } {
    return { window: this.windowCount, day: this.dayCount };
  }

  /** Resolves when it is safe to make one more request. */
  async take(): Promise<void> {
    const now = Date.now();

    if (now - this.windowStart >= WINDOW_MS) {
      this.windowStart = now;
      this.windowCount = 0;
    }
    if (now - this.dayStart >= DAY_MS) {
      this.dayStart = now;
      this.dayCount = 0;
    }

    if (this.dayCount >= this.perDay) {
      throw new Error(
        `Daily Strava request budget (${this.perDay}) exhausted. Re-run tomorrow — the backfill resumes where it stopped.`
      );
    }

    if (this.windowCount >= this.perWindow) {
      const waitMs = WINDOW_MS - (now - this.windowStart) + 1000;
      this.onWait?.(Math.ceil(waitMs / 1000), "15-minute window full");
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.windowStart = Date.now();
      this.windowCount = 0;
    }

    this.windowCount++;
    this.dayCount++;
  }
}
