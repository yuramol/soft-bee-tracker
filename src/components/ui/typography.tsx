import { createElement } from 'react';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Typography({ variant = 'body1', tag, className, children, ...props }: TypographyProps) {
  return createElement(
    tag ?? defaultTagByVariant[variant],
    { 'data-slot': 'typography', className: cn(classNameByVariant[variant], className), ...props },
    children
  );
}

const defaultTagByVariant: Record<TypographyVariant, TypographyTag> = {
  display1: 'h2',
  display2: 'h2',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body1: 'p',
  body2: 'p',
  body3: 'p',
  description: 'p',
  caption: 'span',
  caption2: 'span',
  caption3: 'span'
};

const classNameByVariant: Record<TypographyVariant, string> = {
  display1: 'text-96 leading-[1.17]',
  display2: 'text-80 leading-[1.17]',
  h1: 'text-70 leading-[1.17]',
  h2: 'text-48 leading-[1.24]',
  h3: 'text-32 leading-[1.24]',
  h4: 'text-24 leading-[1.37]',
  h5: 'text-20 leading-[1.37]',
  h6: 'text-18 leading-[1.37]',
  body1: 'text-24 leading-[1.37]',
  body2: 'text-20 leading-[1.37]',
  body3: 'text-18 leading-[1.37]',
  description: 'text-16 leading-[1.10]',
  caption: 'text-16 leading-[1.10]',
  caption2: 'text-14 leading-[1.10]',
  caption3: 'text-12 leading-[1.10]'
};

type TypographyTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';

type TypographyVariant =
  | 'display1'
  | 'display2'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body1'
  | 'body2'
  | 'body3'
  | 'description'
  | 'caption'
  | 'caption2'
  | 'caption3';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  tag?: TypographyTag;
}

export { Typography };
export type { TypographyProps, TypographyTag, TypographyVariant };
