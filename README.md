# tloei-schedule-generator

Generate a 14-week schedule for a 12-team league with 4 divisions, using a circle-method round-robin plus divisional and rivalry second games.

## Install

```bash
pnpm add tloei-schedule-generator
```

## Usage

```ts
import { generateSchedule, defaultLeagueConfig } from 'tloei-schedule-generator'

const schedule = generateSchedule(defaultLeagueConfig)

for (const [i, week] of schedule.entries()) {
  console.log(`Week ${i + 1}:`)
  for (const m of week.matchUps) {
    const tags = [m.isDivisional && 'DIV', m.isRivalry && 'RIV'].filter(Boolean).join(', ')
    console.log(`  ${m.teams.away} @ ${m.teams.home}${tags ? ` [${tags}]` : ''}`)
  }
}
```

### Custom league config

```ts
import {
  generateSchedule,
  Team,
  type LeagueConfig,
} from 'tloei-schedule-generator'

const config: LeagueConfig = {
  divisions: [
    [Team.A, Team.B, Team.C],
    [Team.D, Team.E, Team.F],
    [Team.G, Team.H, Team.I],
    [Team.J, Team.K, Team.L],
  ],
  rivalryPairs: [
    [Team.A, Team.D],
    [Team.B, Team.E],
    // ... one pair per team, cross-division
  ],
}

const schedule = generateSchedule(config)
```

## Schedule constraints

1. Each team plays exactly one game per week.
2. Every team plays every other team at least once.
3. Each week has exactly 6 match-ups.
4. Divisional opponents play each other twice.
5. No pair plays more than twice.
6. Each team has 7 home and 7 away games.
7. Each team plays exactly one non-divisional rivalry game (that pair meets twice).
8. No pair plays in back-to-back weeks.

## API

### `generateSchedule(config, options?)`

Returns an array of 14 `Week` objects.

- **config** – `LeagueConfig` with `divisions` and `rivalryPairs`
- **options.shuffle** – Optional custom shuffle (for testing). Defaults to Fisher-Yates.

### `defaultLeagueConfig`

Pre-configured `LeagueConfig` with the standard 12-team, 4-division setup.

### Types

- `LeagueConfig` – `{ divisions: readonly Division[]; rivalryPairs: readonly RivalryPair[] }`
- `Week` – `{ matchUps: MatchUp[] }`
- `MatchUp` – `{ isDivisional: boolean; isRivalry: boolean; teams: { home: Team; away: Team } }`
- `Team` – Union of team IDs (`'A' | 'B' | ... | 'L'`)

## Scripts

Requires Node.js 24+ (native TypeScript support).

```bash
pnpm test          # Run tests (watch mode with coverage)
pnpm run generate  # Generate and validate a schedule, print to stdout
pnpm run check     # Lint + typecheck
pnpm run format    # Format with Biome
```

## License

ISC
