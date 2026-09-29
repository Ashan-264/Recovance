// Duration formatting for the UI: always hours + minutes, never raw minutes.

/** Seconds → "7h 32m" (or "45m" under an hour). */
export function formatDurationHM(seconds: number): string {
  return formatMinutesHM(Math.round(seconds / 60));
}

/** Minutes → "7h 32m" (or "45m" under an hour). */
export function formatMinutesHM(minutes: number): string {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}
