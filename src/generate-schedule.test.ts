/*
Here are the constraints used to generate this schedule:

1. Each team can only play one (1) game per week.
2. Every team must play every other team at least once (1x).
3. Every week should have six (6) match ups.
4. Each team must play their divisional opponents twice (2x).
5. Each team should not play another team more than twice (2x).
6. Each team should play an equal amount of home and away games (7 & 7).
7. Each team should play one (1) non-divisional rivalry game.
8. Teams cannot play each other in back-to-back weeks.
*/

import { defaultLeagueConfig } from './config'
import { generateSchedule } from './generate-schedule'
import { wizardStateToLeagueConfig } from './lib/compute-rivalries'
import type { Division } from './models/divisions'
import { Team } from './models/teams'
import type { Week } from './models/week'

const { divisions, rivalryPairs } = defaultLeagueConfig

/** Regression: Schedule must never be empty - 14 weeks × 6 matchups each. */
function assertScheduleNotEmptyAndValid(s: Week[]) {
  expect(s).toHaveLength(14)
  for (const week of s) {
    expect(week.matchUps).toHaveLength(6)
  }
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-')
}

function assertAllConstraints(s: Week[], divs: readonly Division[]) {
  const allTeams = Object.values(Team)
  expect(s).toHaveLength(14)
  for (const week of s) {
    const teamsThisWeek: string[] = []
    for (const m of week.matchUps) {
      teamsThisWeek.push(m.teams.home, m.teams.away)
    }
    expect(new Set(teamsThisWeek).size).toBe(teamsThisWeek.length)
  }
  const pairsPlayed = new Set<string>()
  for (const week of s) {
    for (const m of week.matchUps) {
      pairsPlayed.add(pairKey(m.teams.home, m.teams.away))
    }
  }
  for (let i = 0; i < allTeams.length; i++) {
    for (let j = i + 1; j < allTeams.length; j++) {
      const a = allTeams[i]
      const b = allTeams[j]
      if (a && b) expect(pairsPlayed).toContain(pairKey(a, b))
    }
  }
  for (const week of s) {
    expect(week.matchUps).toHaveLength(6)
  }
  for (const team of allTeams) {
    const division = divs.find((d) => d.includes(team))
    if (!division) throw new Error(`Team ${team} not found`)
    for (const opponent of division.filter((t) => t !== team)) {
      let count = 0
      for (const week of s) {
        for (const m of week.matchUps) {
          if (
            (m.teams.home === team && m.teams.away === opponent) ||
            (m.teams.away === team && m.teams.home === opponent)
          )
            count++
        }
      }
      expect(count).toBeGreaterThanOrEqual(2)
    }
  }
  for (let i = 0; i < allTeams.length; i++) {
    for (let j = i + 1; j < allTeams.length; j++) {
      let count = 0
      for (const week of s) {
        for (const m of week.matchUps) {
          if (
            (m.teams.home === allTeams[i] && m.teams.away === allTeams[j]) ||
            (m.teams.away === allTeams[i] && m.teams.home === allTeams[j])
          )
            count++
        }
      }
      expect(count).toBeLessThanOrEqual(2)
    }
  }
  for (const team of allTeams) {
    let homeCount = 0
    let awayCount = 0
    for (const week of s) {
      for (const m of week.matchUps) {
        if (m.teams.home === team) homeCount++
        if (m.teams.away === team) awayCount++
      }
    }
    expect(homeCount).toBe(7)
    expect(awayCount).toBe(7)
  }
  for (const team of allTeams) {
    const division = divs.find((d) => d.includes(team))
    if (!division) throw new Error(`Team ${team} not found`)
    let rivalryCount = 0
    for (const week of s) {
      for (const m of week.matchUps) {
        if (m.teams.home !== team && m.teams.away !== team) continue
        if (!m.isRivalry) continue
        const opponent = m.teams.home === team ? m.teams.away : m.teams.home
        if (opponent && !division.includes(opponent)) rivalryCount++
      }
    }
    expect(rivalryCount).toBeGreaterThanOrEqual(1)
  }
  for (let i = 0; i < s.length - 1; i++) {
    const thisWeek = s[i]
    const nextWeek = s[i + 1]
    if (!thisWeek || !nextWeek) continue
    for (const m of thisWeek.matchUps) {
      const pair = pairKey(m.teams.home, m.teams.away)
      for (const nm of nextWeek.matchUps) {
        expect(pairKey(nm.teams.home, nm.teams.away)).not.toBe(pair)
      }
    }
  }
}

describe('generateSchedule', () => {
  let schedule: Week[]

  beforeAll(() => {
    schedule = generateSchedule(defaultLeagueConfig)
  })

  test('there should be exactly 14 weeks of match ups', () => {
    expect(schedule).toHaveLength(14)
  })

  test('every team can only play one game per week', () => {
    for (const week of schedule) {
      const teamsThisWeek: string[] = []

      for (const matchUp of week.matchUps) {
        teamsThisWeek.push(matchUp.teams.home, matchUp.teams.away)
      }

      const unique = new Set(teamsThisWeek)
      expect(unique.size).toBe(teamsThisWeek.length)
    }
  })

  test('every team must play every other team at least once (1x)', () => {
    const allTeams = Object.values(Team)
    const pairsPlayed = new Set<string>()

    for (const week of schedule) {
      for (const matchUp of week.matchUps) {
        const pair = [matchUp.teams.home, matchUp.teams.away].sort().join('-')
        pairsPlayed.add(pair)
      }
    }

    for (let i = 0; i < allTeams.length; i++) {
      for (let j = i + 1; j < allTeams.length; j++) {
        const pair = [allTeams[i], allTeams[j]].sort().join('-')
        expect(pairsPlayed).toContain(pair)
      }
    }
  })

  test('every week should have six (6) match ups', () => {
    for (const week of schedule) {
      expect(week.matchUps).toHaveLength(6)
    }
  })

  test('each team must play their divisional opponents at least twice (2x)', () => {
    const allTeams = Object.values(Team)

    for (const team of allTeams) {
      const division = divisions.find((d) => d.includes(team))
      if (!division) throw new Error(`Team ${team} not found in any division`)
      const divisionalOpponents = division.filter((t) => t !== team)

      for (const opponent of divisionalOpponents) {
        let count = 0

        for (const week of schedule) {
          for (const matchUp of week.matchUps) {
            const { home, away } = matchUp.teams
            if ((home === team && away === opponent) || (away === team && home === opponent)) {
              count++
            }
          }
        }

        expect(count).toBeGreaterThanOrEqual(2)
      }
    }
  })

  test('each team should not play another team more than twice (2x)', () => {
    const allTeams = Object.values(Team)

    for (let i = 0; i < allTeams.length; i++) {
      for (let j = i + 1; j < allTeams.length; j++) {
        let count = 0

        for (const week of schedule) {
          for (const matchUp of week.matchUps) {
            const { home, away } = matchUp.teams
            if ((home === allTeams[i] && away === allTeams[j]) || (away === allTeams[i] && home === allTeams[j])) {
              count++
            }
          }
        }

        expect(count).toBeLessThanOrEqual(2)
      }
    }
  })

  test('each team should play an equal amount of home and away games (7 & 7)', () => {
    const allTeams = Object.values(Team)

    for (const team of allTeams) {
      let homeCount = 0
      let awayCount = 0

      for (const week of schedule) {
        for (const matchUp of week.matchUps) {
          if (matchUp.teams.home === team) homeCount++
          if (matchUp.teams.away === team) awayCount++
        }
      }

      expect(homeCount).toBe(7)
      expect(awayCount).toBe(7)
    }
  })

  test('each team should play at least one (1) non-divisional rivalry game', () => {
    const allTeams = Object.values(Team)

    for (const team of allTeams) {
      const division = divisions.find((d) => d.includes(team))
      if (!division) throw new Error(`Team ${team} not found in any division`)
      let rivalryCount = 0

      for (const week of schedule) {
        for (const matchUp of week.matchUps) {
          const { home, away } = matchUp.teams
          const isInvolved = home === team || away === team

          if (isInvolved && matchUp.isRivalry) {
            const opponent = home === team ? away : home
            const isNonDivisional = !division.includes(opponent)

            if (isNonDivisional) rivalryCount++
          }
        }
      }

      expect(rivalryCount).toBeGreaterThanOrEqual(1)
    }
  })

  test('teams cannot play each other in back-to-back weeks', () => {
    for (let i = 0; i < schedule.length - 1; i++) {
      const thisWeek = schedule[i]
      const nextWeek = schedule[i + 1]
      if (!thisWeek || !nextWeek) continue

      for (const matchUp of thisWeek.matchUps) {
        const pair = [matchUp.teams.home, matchUp.teams.away].sort().join('-')

        for (const nextMatchUp of nextWeek.matchUps) {
          const nextPair = [nextMatchUp.teams.home, nextMatchUp.teams.away].sort().join('-')
          expect(pair).not.toBe(nextPair)
        }
      }
    }
  })
})

describe('generateSchedule - multiple runs', () => {
  test('produces valid schedule across 100 random runs', () => {
    for (let i = 0; i < 100; i++) {
      const s = generateSchedule(defaultLeagueConfig)
      assertAllConstraints(s, divisions)
    }
  })
})

describe('generateSchedule - flag correctness', () => {
  test('divisional games have isDivisional true and non-divisional have false', () => {
    const s = generateSchedule(defaultLeagueConfig)
    for (const week of s) {
      for (const m of week.matchUps) {
        const [t1, t2] = [m.teams.home, m.teams.away]
        const isDivisional = t1 && t2 && divisions.some((d) => d.includes(t1) && d.includes(t2))
        expect(m.isDivisional).toBe(isDivisional)
      }
    }
  })

  test('rivalry games have isRivalry true and non-rivalry have false', () => {
    const rivalrySet = new Set(rivalryPairs.map(([a, b]) => pairKey(a, b)))
    const s = generateSchedule(defaultLeagueConfig)
    for (const week of s) {
      for (const m of week.matchUps) {
        const key = pairKey(m.teams.home, m.teams.away)
        const isDivisional = divisions.some((d) => d.includes(m.teams.home) && d.includes(m.teams.away))
        const isRivalry = rivalrySet.has(key) && !isDivisional
        expect(m.isRivalry).toBe(isRivalry)
      }
    }
  })
})

describe('generateSchedule - wizard-derived config (regression: empty schedules)', () => {
  test('produces valid non-empty schedule from wizardStateToLeagueConfig', () => {
    const divisionAssignments = [...defaultLeagueConfig.divisions] as unknown as (readonly Team[])[]
    const leagueConfig = wizardStateToLeagueConfig(divisionAssignments)
    const s = generateSchedule(leagueConfig)
    assertScheduleNotEmptyAndValid(s)
    assertAllConstraints(s, divisions)
  })

  test('produces valid schedule across multiple runs (stochastic placement)', () => {
    const divisionAssignments = [...defaultLeagueConfig.divisions] as unknown as (readonly Team[])[]
    for (let i = 0; i < 20; i++) {
      const leagueConfig = wizardStateToLeagueConfig(divisionAssignments)
      const s = generateSchedule(leagueConfig)
      assertScheduleNotEmptyAndValid(s)
    }
  })
})

describe('generateSchedule - retry strategy failure rate', () => {
  const RUNS = 50
  const divisionAssignments = [...defaultLeagueConfig.divisions] as unknown as (readonly Team[])[]
  const noDelay = () => Promise.resolve()

  test(`generateScheduleWithRetry succeeds across ${RUNS} runs (shuffle + random rivalries)`, async () => {
    const { generateScheduleWithRetry } = await import('./lib/schedule-with-retry')
    let failures = 0
    for (let i = 0; i < RUNS; i++) {
      try {
        const s = await generateScheduleWithRetry(divisionAssignments, { delay: noDelay })
        assertScheduleNotEmptyAndValid(s)
      } catch {
        failures++
      }
    }
    expect(failures).toBe(0)
  })
})

describe('generateSchedule - fallback path', () => {
  test('never returns fewer than 84 matchups; throws if placement fails', () => {
    // shuffle that returns reverse order - causes placement to fail (we throw instead of partial weeks)
    const reverseShuffle = <T>(arr: T[]): T[] => [...arr].reverse()
    expect(() => generateSchedule(defaultLeagueConfig, { shuffle: reverseShuffle })).toThrow(
      /Could not find valid placement for weeks 12–14/,
    )
  })

  test('produces exactly 84 matchups when generation succeeds', () => {
    const s = generateSchedule(defaultLeagueConfig)
    const total = s.reduce((sum, w) => sum + w.matchUps.length, 0)
    expect(total).toBe(84)
  })
})
