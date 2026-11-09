import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { useKbPressProps } from '@/lib/press';

/**
 * press: 变体（index.css）= 指针 :active 或键盘 data-kb-press，
 * 松开/移出/失焦由浏览器与 useKbPressProps 即时恢复，非持续选中态；
 * scale 为 transform 不占布局，配色一律取比 hover 更深的档位。
 */
const buttonVariants = cva(
  'cursor-pointer press-glow inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background-color,color,border-color,box-shadow,transform,scale] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:pointer-events-none disabled:opacity-50 press:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-clay text-on-accent hover:bg-clay/90 press:brightness-95',
        destructive: 'bg-red-700 text-white hover:bg-red-800 press:brightness-90',
        outline: 'border border-hairline bg-transparent text-ink hover:bg-ink/5 press:bg-ink/10',
        secondary: 'bg-pine/10 text-pine hover:bg-pine/20 press:bg-pine/30',
        ghost: 'text-ink/70 hover:bg-ink/5 hover:text-ink press:bg-ink/10',
        link: 'text-clay underline-offset-4 hover:underline press:scale-100 press:opacity-75',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-9 px-3 has-[>svg]:px-2.5',
        lg: 'h-11 px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';
  const kbPress = useKbPressProps();

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...kbPress}
      {...props}
    />
  );
}

export { Button };
