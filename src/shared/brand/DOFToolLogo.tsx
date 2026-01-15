import { cn } from '@/lib/utils';

interface DOFToolLogoProps {
  className?: string;
  variant?: 'color' | 'mono';
}

export function DOFToolLogo({ className, variant = 'color' }: DOFToolLogoProps): JSX.Element {
  const stroke = variant === 'color' ? 'hsl(var(--primary))' : 'currentColor';
  const node = variant === 'color' ? 'hsl(var(--brand-accent))' : 'currentColor';
  const surface = variant === 'color' ? 'hsl(var(--background))' : 'transparent';

  return (
    <svg
      aria-hidden="true"
      className={cn('block', className)}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32 10 12 26v26h40V26L32 10Z"
        fill={surface}
        stroke={stroke}
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M22 52V34c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6v18"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path d="M22 44h20" stroke={stroke} strokeLinecap="round" strokeWidth="3" />
      <path
        d="M20 20l12 10 12-10"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />

      <circle cx="12" cy="26" fill={node} r="4" />
      <circle cx="52" cy="26" fill={node} r="4" />
      <circle cx="32" cy="10" fill={node} r="4" />

      <path d="M12 26 32 10 52 26" stroke={node} strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}
