import type { LeagueConfig, RivalryPair } from '@/config'
import type { Division } from '@/models'
import { Team } from '@/models'
import { shuffle } from '@/utils'

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

/**
 * Compute a random valid rivalry matching (each team paired with one team from another division).
 * Samples from the full space of valid matchings, not just those reachable via division-order shuffling.
 */
export function computeRandomRivalryPairs(divisions: readonly Division[]): RivalryPair[] {
  const allTeams = shuffle([...Object.values(Team) as Team[]])
  const pairs: RivalryPair[] = []
  const used = new Set<Team>()
  const teamToDiv = new Map<Team, number>()
  for (let i = 0; i < divisions.length; i++) {
    const div = divisions[i]
    if (div) for (const t of div) teamToDiv.set(t, i)
  }

  for (const team of allTeams) {
    if (used.has(team)) continue
    const myDiv = teamToDiv.get(team) ?? -1
    const validRivals = (Object.values(Team) as Team[]).filter(
      (t) => !used.has(t) && t !== team && teamToDiv.get(t) !== myDiv
    )
    const rival = validRivals[Math.floor(Math.random() * validRivals.length)]
    if (!rival) continue
    pairs.push([team, rival])
    used.add(team)
    used.add(rival)
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

/** Build LeagueConfig with random rivalry pairs. Same divisions, different rivalry matching. */
export function wizardStateToLeagueConfigWithRandomRivalries(
  divisionAssignments: readonly (readonly Team[])[]
): LeagueConfig {
  if (divisionAssignments.length !== 4 || divisionAssignments.some((d) => d.length !== 3)) {
    throw new Error('Division assignments must be 4 slots of 3 teams each')
  }
  const divisions = divisionAssignments as Division[]
  const rivalryPairs = computeRandomRivalryPairs(divisions)
  return { divisions, rivalryPairs }
}
