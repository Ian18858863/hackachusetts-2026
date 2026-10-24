import type { ReactNode } from 'react';
import type { IconName } from './Icon';
import { StatePanel } from './StatePanel';

export type EmptyStateProps = {
  /** One short phrase, no trailing punctuation. */
  title: string;
  description?: ReactNode;
  /** Usually one Button that creates the first item. */
  action?: ReactNode;
  icon?: IconName;
  titleLevel?: 2 | 3 | 4;
  compact?: boolean;
  className?: string;
};

export function EmptyState({ icon = 'inbox', action, ...rest }: EmptyStateProps) {
  return <StatePanel tone="neutral" icon={icon} actions={action} {...rest} />;
}
