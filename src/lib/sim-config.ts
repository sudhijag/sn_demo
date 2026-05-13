export const SIM_TICK_MS = 6667;
export const SIM_PHASE_TICKS = {
  baseline: 3,
  incident: 6,
  response: 9,
  recovery: 12,
} as const;

export const SIM_TOTAL_PROGRESS_TICKS = SIM_PHASE_TICKS.recovery;
