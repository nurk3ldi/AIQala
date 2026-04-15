import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  busy?: boolean;
  block?: boolean;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  busy = false,
  block = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) => (
  <button
    className={`button button--${variant} button--${size} ${block ? 'button--block' : ''} ${className}`.trim()}
    disabled={disabled || busy}
    {...props}
  >
    {busy ? 'Орындалып жатыр...' : children}
  </button>
);
