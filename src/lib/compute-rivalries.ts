import type { LeagueConfig, RivalryPair } from '@/config'
import type { Division } from '@/models'
import { Team } from '@/models'

/** Compute cross-division rivalry pairs: one per team, deterministic. */
export function computeRivalryPairs(divisions: readonly Division[]): RivalryPair[] {
  const allTeams = Object.values(Team) as Team[]
  const pairs: RivalryPair[] = []
  const used = new Set<Team>()

  for (const team of allTeams) {
    if (used.has(team)) continue
    const teamDivIdx = divisions.findIndex((d) => d.includes(team))
    if (teamDivIdx === -1) continue
    for (let i = 0; i < divisions.length; i++) {
      if (i === teamDivIdx) continue
      const div = divisions[i]
      if (!div) continue
      for (const other of div) {
        if (!used.has(other)) {
          pairs.push([team, other])
          used.add(team)
          used.add(other)
          break
        }
      }
      if (used.has(team)) break
    }
  }
  return pairs
}

/** Build LeagueConfig from wizard division assignments (must be 4 slots of 3 teams each). */
export function wizardStateToLeagueConfig(divisionAssignments: readonly (readonly Team[])[]): LeagueConfig {
  if (divisionAssignments.length !== 4 || divisionAssignments.some((d) => d.length !== 3)) {
    throw new Error('Division assignments must be 4 slots of 3 teams each')
  }
  const divisions = divisionAssignments as Division[]
  const rivalryPairs = computeRivalryPairs(divisions)
  return { divisions, rivalryPairs }
}
