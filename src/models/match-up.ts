import type { Team } from './teams.ts'

/** A single match-up between two teams. */
export type MatchUp = {
  /** True if both teams are in the same division. */
  isDivisional: boolean
  /** True if this is a non-divisional rivalry game. */
  isRivalry: boolean
  teams: {
    home: Team
    away: Team
  }
}
