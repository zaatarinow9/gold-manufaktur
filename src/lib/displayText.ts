const TRAILING_DISPLAY_PERIOD = /[.。．]+$/u;

export function trimDisplayHeading(value: string) {
  return value.trim().replace(TRAILING_DISPLAY_PERIOD, "");
}
