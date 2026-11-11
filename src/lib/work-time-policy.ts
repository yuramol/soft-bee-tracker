import { addMonths, format, parseISO } from 'date-fns';

// The company works in UTC+2. IANA "Etc/GMT-2" is fixed UTC+2 (the sign is inverted by design).
export const COMPANY_TIME_ZONE = 'Etc/GMT-2';

export const COMPANY_TIME_ZONE_LABEL = 'UTC+2';

const COMPANY_UTC_OFFSET_MINUTES = 2 * 60;

const EDIT_DEADLINE_DAY = 5;

// Time for a month can be added or changed until 23:59 (UTC+2) on the 5th of the next month
export function getEntryEditDeadline(dateKey: string): Date {
  const nextMonth = addMonths(parseISO(dateKey), 1);
  const lastMinuteUtc = Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), EDIT_DEADLINE_DAY, 23, 59, 59, 999);

  return new Date(lastMinuteUtc - COMPANY_UTC_OFFSET_MINUTES * 60 * 1000);
}

export function isEntryDateOpen(dateKey: string, now: Date): boolean {
  return now.getTime() <= getEntryEditDeadline(dateKey).getTime();
}

// The earliest date that is still open, e.g. on 6 Dec everything before 1 Dec is closed
export function getEarliestOpenDateKey(now: Date): string {
  const companyNow = new Date(now.getTime() + COMPANY_UTC_OFFSET_MINUTES * 60 * 1000);
  const year = companyNow.getUTCFullYear();
  const month = companyNow.getUTCMonth();
  const previousMonthStillOpen = companyNow.getUTCDate() <= EDIT_DEADLINE_DAY;
  const start = new Date(year, previousMonthStillOpen ? month - 1 : month, 1);

  return format(start, 'yyyy-MM-dd');
}
