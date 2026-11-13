export const YEARS_PER_PAGE = 12;

// pages are aligned blocks (2016–2027, 2028–2039…) so paging back and forth is predictable
export function getYearPageStart(year: number): number {
  return year - (((year % YEARS_PER_PAGE) + YEARS_PER_PAGE) % YEARS_PER_PAGE);
}

export function getYearPage(pageStart: number): number[] {
  return Array.from({ length: YEARS_PER_PAGE }, (_, index) => pageStart + index);
}

// month is 0-based, like Date#getMonth
export function isMonthAfter(year: number, month: number, limit: Date | undefined): boolean {
  if (!limit) {
    return false;
  }

  return year > limit.getFullYear() || (year === limit.getFullYear() && month > limit.getMonth());
}
