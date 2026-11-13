import { formatText } from '@/lib/format-text';
import content from './content.json';

export function formatDayCount(count: number): string {
  return formatText(content.leave.daysValue, { count: String(count), unit: count === 1 ? content.leave.day : content.leave.days });
}
