/**
 * Whimsical messages shown during schedule generation/regeneration.
 * One is picked at random each time the overlay is shown.
 */
export const GENERATING_MESSAGES = [
  'Conjuring your schedule...',
  'Shuffling the cosmic deck...',
  'Consulting the scheduling oracles...',
  'Rolling the dice of fate...',
  'Mixing rivalries in a cauldron...',
  'Assembling the matchup matrix...',
  'Summoning home/away balance...',
  'Brewing the perfect schedule...',
  'Aligning the stars for week 1...',
  'Bribing the scheduling gnomes...',
  'Sorting teams by moon phase...',
  'Crossing Ts and dotting matchups...',
  'Teaching division rivalries to dance...',
  'Waking the scheduling sloth...',
  'Juggling 84 matchups...',
  'Polishing the fixture list...',
  'Herding teams into weeks...',
  'Tossing the scheduling salad...',
  'Unfurling the season scroll...',
  'Calibrating rivalry intensity...',
  'Baking a fresh schedule...',
  'Reading the tea leaves...',
  'Spinning the wheel of matchups...',
  'Untangling the fixture web...',
  'Charging the schedule crystal...',
  'Tuning the rivalry resonator...',
  'Lining up the dominoes...',
  'Whispering to the fixture gods...',
  'Counting the ways teams could meet...',
  'Shaking the scheduling snow globe...',
] as const

export function randomGeneratingMessage(): string {
  return GENERATING_MESSAGES[Math.floor(Math.random() * GENERATING_MESSAGES.length)]
}
