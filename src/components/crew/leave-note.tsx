import { cn } from '@/lib/utils';
import content from './content.json';

export function LeaveNote({ note, className }: LeaveNoteProps) {
  return (
    <figure className={cn('border-border flex flex-col gap-0.5 border-l-2 pl-3', className)}>
      <figcaption className='text-muted-foreground text-xs'>{content.leave.noteLabel}</figcaption>
      <blockquote className='text-sm break-words whitespace-pre-line'>{note}</blockquote>
    </figure>
  );
}

interface LeaveNoteProps {
  note: string;
  className?: string;
}
