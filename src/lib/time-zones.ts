// IANA zones come from the runtime, so the list stays current without a bundled table

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) {
    return false;
  }

  try {
    // aliases such as Europe/Kiev and Europe/Kyiv are both accepted here
    new Intl.DateTimeFormat('en-US', { timeZone });

    return true;
  } catch {
    return false;
  }
}

// "GMT+02:00"; plain "GMT" is normalised so every label lines up
export function getTimeZoneOffset(timeZone: string, date: Date): string {
  const offset =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';

  return offset === 'GMT' ? 'GMT+00:00' : offset;
}

export function toTimeZoneOption(timeZone: string, date: Date): TimeZoneOption {
  const offset = getTimeZoneOffset(timeZone, date);

  return { value: timeZone, offset, label: `${timeZone.replaceAll('_', ' ')} (${offset})` };
}

// sorted west to east, then by name, which is how people scan for their zone;
// extra zones (the saved one, the device one) are added when the runtime list
// spells them differently, e.g. Europe/Kyiv vs Europe/Kiev
export function buildTimeZoneOptions(zones: string[], extraZones: Array<string | null | undefined>, date: Date): TimeZoneOption[] {
  const unique = new Set(zones);

  for (const zone of extraZones) {
    if (zone && isValidTimeZone(zone)) {
      unique.add(zone);
    }
  }

  return [...unique]
    .map((zone) => toTimeZoneOption(zone, date))
    .sort((a, b) => offsetToMinutes(a.offset) - offsetToMinutes(b.offset) || a.value.localeCompare(b.value));
}

export function getRuntimeTimeZones(): string[] {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];

  return zones.includes('UTC') ? zones : [...zones, 'UTC'];
}

function offsetToMinutes(offset: string): number {
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offset);

  if (!match) {
    return 0;
  }

  const minutes = Number(match[2]) * 60 + Number(match[3]);

  return match[1] === '-' ? -minutes : minutes;
}

export interface TimeZoneOption {
  value: string;
  offset: string;
  label: string;
}
