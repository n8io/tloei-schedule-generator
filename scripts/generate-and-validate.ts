import { defaultLeagueConfig } from '../src/config/index.ts'
import { generateSchedule } from '../src/generate-schedule.ts'
import { Team } from '../src/models/teams.ts'
import type { Week } from '../src/models/week'

const schedule = generateSchedule(defaultLeagueConfig)

function pass(name: string) {
  console.log(`  ✓ ${name}`)
}
function fail(name: string, msg: string) {
  console.log(`  ✗ ${name}: ${msg}`)
}

let allPassed = true

// 1. 14 weeks
if (schedule.length === 14) pass('14 weeks')
else {
  fail('14 weeks', `got ${schedule.length}`)
  allPassed = false
}

// 2. One game per team per week
let ok = true
for (const week of schedule) {
  const teams = week.matchUps.flatMap((m) => [m.teams.home, m.teams.away])
  if (new Set(teams).size !== teams.length) {
    ok = false
    break
  }
}
if (ok) pass('one game per team per week')
else {
  fail('one game per team per week', 'duplicate team in week')
  allPassed = false
}

// 3. Every pair at least once
const allTeams = Object.values(Team)
const pairsPlayed = new Set<string>()
for (const week of schedule) {
  for (const m of week.matchUps) {
    pairsPlayed.add([m.teams.home, m.teams.away].sort().join('-'))
  }
}
const missing: string[] = []
for (let i = 0; i < allTeams.length; i++) {
  for (let j = i + 1; j < allTeams.length; j++) {
    const p = [allTeams[i], allTeams[j]].sort().join('-')
    if (!pairsPlayed.has(p)) missing.push(p)
  }
}
if (missing.length === 0) pass('every pair plays at least once')
else {
  fail('every pair plays at least once', `missing: ${missing.join(', ')}`)
  allPassed = false
}

// 4. Six match-ups per week
const sixPerWeek = schedule.every((w) => w.matchUps.length === 6)
if (sixPerWeek) pass('six match-ups per week')
else {
  fail('six match-ups per week', 'some week has != 6')
  allPassed = false
}

// 5. Divisional opponents 2x
ok = true
for (const team of allTeams) {
  const div = defaultLeagueConfig.divisions.find((d) => d.includes(team))
  if (!div) continue
  for (const opp of div.filter((t) => t !== team)) {
    let count = 0
    for (const week of schedule) {
      for (const m of week.matchUps) {
        const { home, away } = m.teams
        if ((home === team && away === opp) || (away === team && home === opp)) count++
      }
    }
    if (count < 2) {
      ok = false
      break
    }
  }
}
if (ok) pass('divisional opponents at least 2x')
else {
  fail('divisional opponents at least 2x', 'some pair < 2')
  allPassed = false
}

// 6. No pair more than 2x
ok = true
for (let i = 0; i < allTeams.length; i++) {
  for (let j = i + 1; j < allTeams.length; j++) {
    let count = 0
    for (const week of schedule) {
      for (const m of week.matchUps) {
        const { home, away } = m.teams
        if ((home === allTeams[i] && away === allTeams[j]) || (away === allTeams[i] && home === allTeams[j])) count++
      }
    }
    if (count > 2) {
      ok = false
      break
    }
  }
}
if (ok) pass('no pair more than 2x')
else {
  fail('no pair more than 2x', 'some pair > 2')
  allPassed = false
}

// 7. 7 home, 7 away per team
ok = true
for (const team of allTeams) {
  let h = 0
  let a = 0
  for (const week of schedule) {
    for (const m of week.matchUps) {
      if (m.teams.home === team) h++
      if (m.teams.away === team) a++
    }
  }
  if (h !== 7 || a !== 7) {
    ok = false
    break
  }
}
if (ok) pass('7 home, 7 away per team')
else {
  fail('7 home, 7 away per team', 'imbalance')
  allPassed = false
}

// 8. At least one non-divisional rivalry per team
ok = true
for (const team of allTeams) {
  const div = defaultLeagueConfig.divisions.find((d) => d.includes(team))
  if (!div) continue
  let count = 0
  for (const week of schedule) {
    for (const m of week.matchUps) {
      if (!m.isRivalry) continue
      const { home, away } = m.teams
      if (home !== team && away !== team) continue
      const opp = home === team ? away : home
      if (!div.includes(opp)) count++
    }
  }
  if (count < 1) {
    ok = false
    break
  }
}
if (ok) pass('at least one non-divisional rivalry per team')
else {
  fail('at least one non-divisional rivalry per team', 'missing for some team')
  allPassed = false
}

// 9. No back-to-back same pair
ok = true
for (let i = 0; i < schedule.length - 1; i++) {
  const w1 = schedule[i]
  const w2 = schedule[i + 1]
  if (!w1 || !w2) continue
  for (const m1 of w1.matchUps) {
    const p = [m1.teams.home, m1.teams.away].sort().join('-')
    for (const m2 of w2.matchUps) {
      const p2 = [m2.teams.home, m2.teams.away].sort().join('-')
      if (p === p2) {
        ok = false
        break
      }
    }
  }
}
if (ok) pass('no back-to-back same pair')
else {
  fail('no back-to-back same pair', 'repeated pair')
  allPassed = false
}

console.log('')
if (allPassed) {
  console.log('All validations passed.')
} else {
  console.log('Some validations failed.')
  process.exit(1)
}

console.log('\nSchedule:')
for (let w = 0; w < schedule.length; w++) {
  const week = schedule[w] as Week
  console.log(`\nWeek ${w + 1}:`)
  for (const m of week.matchUps) {
    const tags = []
    if (m.isDivisional) tags.push('DIV')
    if (m.isRivalry) tags.push('RIV')
    const tag = tags.length ? ` [${tags.join(',')}]` : ''
    console.log(`  ${m.teams.away} @ ${m.teams.home}${tag}`)
  }
}
