import { Typography } from '@ui/typography';

export function AuthHeading({ title, description }: AuthHeadingProps) {
  return (
    <div className='flex flex-col gap-2'>
      <Typography variant='h3' tag='h1' className='font-semibold tracking-tight'>
        {title}
      </Typography>
      <p className='text-muted-foreground text-sm'>{description}</p>
    </div>
  );
}

interface AuthHeadingProps {
  title: string;
  description: string;
}
