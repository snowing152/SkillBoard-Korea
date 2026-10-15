import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Every button and button-looking link. Heights never go below 44 px (touch target); labels may wrap
 * to two lines (Russian), so there is no `whitespace-nowrap`. `shape="pill"` is the fully round form
 * (media actions, chips); the default is the 12 px control radius.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-clip-padding text-center text-button font-semibold transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-border',
        outline: 'border-input bg-card text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        destructive: 'bg-danger text-primary-foreground hover:bg-danger/90',
        link: 'text-primary underline-offset-4 hover:text-primary-hover hover:underline',
        /** White button on the dark media cover ("Watch intro"). */
        inverse: 'bg-card text-foreground hover:bg-muted',
        /** Hairline button on the media cover or the primary fallback (language switcher). */
        onMedia:
          'border-media-foreground/60 bg-transparent text-media-foreground hover:bg-media-foreground/10',
      },
      size: {
        default: 'min-h-11 px-4 py-2',
        lg: 'min-h-12.5 px-5 py-2.5',
        sm: 'min-h-11 px-3 py-1.5 text-body-sm',
        icon: 'size-11',
      },
      shape: {
        default: '',
        pill: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  shape = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
