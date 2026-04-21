import type { ButtonHTMLAttributes } from 'react';
import { useTranslation } from '../../context/language-context';

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
}: ButtonProps) => {
  const { t } = useTranslation();

  return (
    <button
      className={`button button--${variant} button--${size} ${block ? 'button--block' : ''} ${className}`.trim()}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? t('common.loading') : children}
    </button>
  );
};
