/** Awake if local hour is in [wake, sleep) for same-day windows, or overnight if wake > sleep */
export function isAwakeHour(localHour: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) return false
  if (wakeHour < sleepHour) {
    return localHour >= wakeHour && localHour < sleepHour
  }
  return localHour >= wakeHour || localHour < sleepHour
}
