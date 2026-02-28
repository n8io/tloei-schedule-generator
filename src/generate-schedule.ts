import type { LeagueConfig } from './config/league.ts'
import type { Division } from './models/divisions.ts'
import type { MatchUp } from './models/match-up.ts'
import { Team } from './models/teams.ts'
import type { Week } from './models/week.ts'
import { WEEK_COUNT } from './models/week.ts'
import { shuffle } from './utils/index.ts'

/** Number of round-robin weeks (weeks 1–11). */
const ROUND_ROBIN_WEEKS = 11

/** Match-ups per week. */
const MATCH_UPS_PER_WEEK = 6

/** Max backtracking attempts for placing weeks 12–14 (per strategy, per retry). */
const MAX_PLACEMENT_ATTEMPTS = 150

/** Internal retries for the entire placement phase before throwing. */
const MAX_PLACEMENT_RETRIES = 3

/** Max iterations for home/away balance swaps. */
const MAX_BALANCE_ITERATIONS = 200

/** Home (and away) games per team per season. */
const HOME_GAMES_PER_TEAM = 7

export type GenerateScheduleOptions = {
  /**
   * Custom shuffle for placement attempts. Used for testing fallback path.
   * @default internal Fisher-Yates shuffle
   */
  shuffle?: <T>(array: T[]) => T[]
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-')
}

function buildRivalrySet(rivalryPairs: readonly (readonly [string, string])[]): Set<string> {
  const set = new Set<string>()
  for (const [a, b] of rivalryPairs) {
    set.add(pairKey(a, b))
  }
  return set
}

type RawMatch = {
  home: Team
  away: Team
  isDiv: boolean
  isRiv: boolean
}

/**
 * Generate a 14-week schedule for a 12-team league.
 *
 * **Weeks 1–11:** Single round-robin using the circle method (every pair plays once).
 * **Weeks 12–14:** Second games for divisional opponents and rivalry pairs.
 *
 * Constraints enforced:
 * - One game per team per week
 * - Every pair plays at least once, at most twice
 * - Divisional opponents play exactly twice
 * - Each team has one non-divisional rivalry (plays twice)
 * - 7 home, 7 away per team
 * - No back-to-back weeks for the same pair
 *
 * @param config - League config (divisions and rivalry pairs)
 * @param options - Optional overrides (e.g. custom shuffle for tests)
 * @returns Array of 14 weeks, each with 6 match-ups
 */
function generateSchedule(config: LeagueConfig, options?: GenerateScheduleOptions): Week[] {
  const { divisions, rivalryPairs } = config
  const doShuffle = options?.shuffle ?? shuffle
  const allTeams = Object.values(Team) as Team[]
  const rivalrySet = buildRivalrySet(rivalryPairs)

  const isDiv = (a: string, b: string): boolean =>
    (divisions as Division[]).some((d) => d.includes(a as Team) && d.includes(b as Team))

  const isRiv = (a: string, b: string): boolean => rivalrySet.has(pairKey(a, b)) && !isDiv(a, b)

  const schedule: RawMatch[][] = []

  // Circle method: fix last team, rotate others
  const teams = [...allTeams]
  const homeCount: Record<Team, number> = {} as Record<Team, number>
  for (const t of allTeams) homeCount[t] = 0

  for (let round = 0; round < ROUND_ROBIN_WEEKS; round++) {
    const week: RawMatch[] = []
    const pairIndices: [number, number][] = [
      [0, 1],
      [11, 2],
      [10, 3],
      [9, 4],
      [8, 5],
      [7, 6],
    ]
    for (const [i, j] of pairIndices) {
      const a = teams[i]
      const b = teams[j]
      if (a === undefined || b === undefined) throw new Error(`Invalid team index: ${i}, ${j}`)
      const ha = homeCount[a] ?? 0
      const hb = homeCount[b] ?? 0
      const home = ha <= hb ? a : b
      const away = home === a ? b : a
      homeCount[home] = (homeCount[home] ?? 0) + 1
      week.push({
        home,
        away,
        isDiv: isDiv(home, away),
        isRiv: isRiv(home, away),
      })
    }
    schedule.push(week)
    const t = teams[1]
    if (t === undefined) throw new Error('Invalid rotation')
    for (let i = 1; i < ROUND_ROBIN_WEEKS; i++) {
      const next = teams[i + 1]
      teams[i] = next ?? t
    }
    teams[11] = t
  }

  // Weeks 12–14: second games (12 divisional + 6 rivalry = 18)
  const secondGames: { a: Team; b: Team; isDiv: boolean; isRiv: boolean }[] = []
  for (const div of divisions) {
    const d = div as [Team, Team, Team]
    for (let i = 0; i < d.length; i++) {
      for (let j = i + 1; j < d.length; j++) {
        const ai = d[i]
        const aj = d[j]
        if (ai !== undefined && aj !== undefined) secondGames.push({ a: ai, b: aj, isDiv: true, isRiv: false })
      }
    }
  }
  for (const r of rivalryPairs) {
    const [a, b] = r
    if (a !== undefined && b !== undefined) secondGames.push({ a, b, isDiv: false, isRiv: true })
  }

  const week11 = schedule[ROUND_ROBIN_WEEKS - 1]
  if (!week11) throw new Error('Week 11 missing')
  const week11Pairs = new Set(week11.map((m) => pairKey(m.home, m.away)))

  const placeWeeks = (): boolean => {
    const toPlace = secondGames.map((g, i) => ({ ...g, idx: i }))
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const shuffled = attempt === 0 && !options?.shuffle ? toPlace : doShuffle(toPlace)
      const placed = new Set<number>()
      const weeks12_14: RawMatch[][] = []
      const hc = { ...homeCount }

      let ok = true
      for (let w = 0; w < WEEK_COUNT - ROUND_ROBIN_WEEKS; w++) {
        const prevWeek = weeks12_14[w - 1]
        const prev = w === 0 ? week11Pairs : new Set((prevWeek ?? []).map((m) => pairKey(m.home, m.away)))
        const week: RawMatch[] = []
        const used = new Set<string>()

        for (let slot = 0; slot < MATCH_UPS_PER_WEEK; slot++) {
          let found = false
          for (const g of shuffled) {
            if (placed.has(g.idx)) continue
            const { a, b } = g
            if (used.has(a) || used.has(b)) continue
            if (prev.has(pairKey(a, b))) continue
            const ha = hc[a] ?? 0
            const hb = hc[b] ?? 0
            const home = ha < hb ? a : hb < ha ? b : a
            const away = home === a ? b : a

            placed.add(g.idx)
            used.add(a)
            used.add(b)
            hc[home] = (hc[home] ?? 0) + 1
            week.push({ home, away, isDiv: g.isDiv, isRiv: g.isRiv })
            found = true
            break
          }
          if (!found) {
            ok = false
            break
          }
        }
        if (!ok || week.length < MATCH_UPS_PER_WEEK) {
          ok = false
          break
        }
        weeks12_14.push(week)
      }
      if (ok && weeks12_14.length === WEEK_COUNT - ROUND_ROBIN_WEEKS) {
        for (const week of weeks12_14) schedule.push(week)
        for (const t of allTeams) homeCount[t] = hc[t] ?? 0
        return true
      }
    }
    return false
  }

  let placementSucceeded = false
  for (let retry = 0; retry < MAX_PLACEMENT_RETRIES && !placementSucceeded; retry++) {
    if (placeWeeks()) {
      placementSucceeded = true
      break
    }
    // Fallback: try shuffled orderings until we can place 6 matchups per week
    const toPlace = secondGames.map((g, i) => ({ ...g, idx: i }))
    let fallbackOk = false
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const shuffled = doShuffle(toPlace)
      const placed = new Set<number>()
      const weeks12_14: RawMatch[][] = []
      const hc = { ...homeCount }

      let ok = true
      for (let w = 0; w < WEEK_COUNT - ROUND_ROBIN_WEEKS; w++) {
        const prevWeek = weeks12_14[w - 1]
        const prev = w === 0 ? week11Pairs : new Set((prevWeek ?? []).map((m) => pairKey(m.home, m.away)))
        const week: RawMatch[] = []
        const used = new Set<string>()

        for (const g of shuffled) {
          if (placed.has(g.idx)) continue
          const { a, b } = g
          if (used.has(a) || used.has(b)) continue
          if (prev.has(pairKey(a, b))) continue
          const ha = hc[a] ?? 0
          const hb = hc[b] ?? 0
          const home = ha <= hb ? a : b
          const away = home === a ? b : a
          placed.add(g.idx)
          used.add(a)
          used.add(b)
          hc[home] = (hc[home] ?? 0) + 1
          week.push({ home, away, isDiv: g.isDiv, isRiv: g.isRiv })
          if (week.length >= MATCH_UPS_PER_WEEK) break
        }

        if (week.length < MATCH_UPS_PER_WEEK) {
          ok = false
          break
        }
        weeks12_14.push(week)
      }

      if (ok && weeks12_14.length === WEEK_COUNT - ROUND_ROBIN_WEEKS) {
        for (const week of weeks12_14) schedule.push(week)
        for (const t of allTeams) homeCount[t] = hc[t] ?? 0
        fallbackOk = true
        break
      }
    }

    if (fallbackOk) {
      placementSucceeded = true
      break
    }

    // Last resort: try shuffled orderings (same algorithm as fallback, different iteration)
    const toPlaceLastResort = secondGames.map((g, i) => ({ ...g, idx: i }))
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const shuffled = doShuffle(toPlaceLastResort)
      const placed = new Set<number>()
      const weeks12_14: RawMatch[][] = []
      const hc = { ...homeCount }

      let ok = true
      for (let w = 0; w < WEEK_COUNT - ROUND_ROBIN_WEEKS; w++) {
        const prevWeek = weeks12_14[w - 1]
        const prev = w === 0 ? week11Pairs : new Set((prevWeek ?? []).map((m) => pairKey(m.home, m.away)))
        const week: RawMatch[] = []
        const used = new Set<string>()

        for (const g of shuffled) {
          if (placed.has(g.idx)) continue
          const { a, b } = g
          if (used.has(a) || used.has(b)) continue
          if (prev.has(pairKey(a, b))) continue
          const ha = hc[a] ?? 0
          const hb = hc[b] ?? 0
          const home = ha <= hb ? a : b
          const away = home === a ? b : a
          placed.add(g.idx)
          used.add(a)
          used.add(b)
          hc[home] = (hc[home] ?? 0) + 1
          week.push({ home, away, isDiv: g.isDiv, isRiv: g.isRiv })
          if (week.length >= MATCH_UPS_PER_WEEK) break
        }

        if (week.length < MATCH_UPS_PER_WEEK) {
          ok = false
          break
        }
        weeks12_14.push(week)
      }

      if (ok && weeks12_14.length === WEEK_COUNT - ROUND_ROBIN_WEEKS) {
        for (const week of weeks12_14) schedule.push(week)
        for (const t of allTeams) homeCount[t] = hc[t] ?? 0
        fallbackOk = true
        break
      }
    }

    if (fallbackOk) {
      placementSucceeded = true
      break
    }
    if (retry === MAX_PLACEMENT_RETRIES - 1) {
      throw new Error(
        'Could not find valid placement for weeks 12–14; retrying with different team order.',
      )
    }
  }

  // Balance home/away to 7 each via iterative swaps
  for (let iter = 0; iter < MAX_BALANCE_ITERATIONS; iter++) {
    const cnt: Record<string, number> = {}
    for (const t of allTeams) cnt[t] = 0
    for (const week of schedule) {
      for (const m of week) cnt[m.home] = (cnt[m.home] ?? 0) + 1
    }
    let done = true
    for (const week of schedule) {
      for (const m of week) {
        const h = m.home
        const a = m.away
        const ch = cnt[h] ?? 0
        const ca = cnt[a] ?? 0
        if (ch > HOME_GAMES_PER_TEAM && ca < HOME_GAMES_PER_TEAM) {
          m.home = a
          m.away = h
          cnt[h] = ch - 1
          cnt[a] = ca + 1
          done = false
          break
        }
      }
      if (!done) break
    }
    if (done) break
  }

  const result: Week[] = schedule.map(
    (week): Week => ({
      matchUps: week.map(
        (m): MatchUp => ({
          isDivisional: m.isDiv,
          isRivalry: m.isRiv,
          teams: { home: m.home, away: m.away },
        })
      ),
    })
  )

  const totalMatchups = result.reduce((sum, w) => sum + w.matchUps.length, 0)
  if (totalMatchups !== 84) {
    throw new Error(
      `Schedule generation produced ${totalMatchups} matchups instead of 84 (14 weeks × 6). Please change the divisions and try again.`,
    )
  }

  return result
}

export { generateSchedule }
