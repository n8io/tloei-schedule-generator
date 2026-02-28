import { Team } from './teams.ts'

/** A division: exactly 3 teams. */
export type Division = readonly [Team, Team, Team]

/** The four divisions of the league. */
export const divisions: readonly Division[] = [
  [Team.A, Team.B, Team.C],
  [Team.D, Team.E, Team.F],
  [Team.G, Team.H, Team.I],
  [Team.J, Team.K, Team.L],
] as const
