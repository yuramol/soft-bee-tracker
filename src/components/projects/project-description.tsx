import { parseDescription } from '@/lib/projects';
import { cn } from '@/lib/utils';

// Rendered from parsed blocks as plain text nodes, never as HTML
export function ProjectDescription({ text, className }: ProjectDescriptionProps) {
  return (
    <div className={cn('flex flex-col gap-3 text-sm leading-relaxed', className)}>
      {parseDescription(text).map((block, index) => {
        if (block.type === 'paragraph') {
          return (
            <p key={index} className='break-words whitespace-pre-line'>
              {block.text}
            </p>
          );
        }

        const ListTag = block.ordered ? 'ol' : 'ul';

        return (
          <ListTag key={index} className={cn('flex flex-col gap-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className='break-words'>
                {item}
              </li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}

interface ProjectDescriptionProps {
  text: string;
  className?: string;
}
