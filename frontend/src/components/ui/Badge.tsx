import type { ReactNode } from 'react';

interface BadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
  children: ReactNode;
}

export const Badge = ({ tone = 'neutral', children }: BadgeProps) => (
  <span className={`badge badge--${tone}`}>{children}</span>
);
