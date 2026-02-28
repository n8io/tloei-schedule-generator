import type { MatchUp } from './match-up.ts'

/** One week of the schedule: 6 match-ups. */
export type Week = {
  matchUps: MatchUp[]
}

/** Number of weeks in a season. */
export const WEEK_COUNT = 14
