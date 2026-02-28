/**
 * League configuration: divisions and rivalry pairs.
 * This is the single source of truth for league structure.
 */
import type { Division } from '../models/divisions.ts'
import { divisions } from '../models/divisions.ts'
import { Team } from '../models/teams.ts'

/** A rivalry pair: two non-divisional teams that play each other twice. */
export type RivalryPair = readonly [Team, Team]

/** Default rivalry pairs (one per team, cross-division). */
export const rivalryPairs: readonly RivalryPair[] = [
  [Team.A, Team.D],
  [Team.B, Team.E],
  [Team.C, Team.F],
  [Team.G, Team.J],
  [Team.H, Team.K],
  [Team.I, Team.L],
] as const

/**
 * Complete league configuration for schedule generation.
 */
export type LeagueConfig = {
  /** Divisions; each division contains exactly 3 teams. */
  divisions: readonly Division[]
  /** Non-divisional rivalry pairs; each pair plays twice. */
  rivalryPairs: readonly RivalryPair[]
}

/** Default 12-team, 4-division league configuration. */
export const defaultLeagueConfig: LeagueConfig = {
  divisions,
  rivalryPairs,
}

export { divisions }
