import type { ReactNode } from 'react';
import { useT } from '../../shared/i18n';
import apiMessages from '../../shared/i18n/messages/api';
import common from '../../shared/i18n/messages/common';
import { Button } from './Button';
import { Icon } from './Icon';
import { StatePanel } from './StatePanel';

export type ErrorStateProps = {
  /** What went wrong, in plain words. One short phrase. */
  title?: string;
  /** What the user can do about it. */
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  /** Raw error text for debugging, hidden behind a disclosure. */
  details?: ReactNode;
  titleLevel?: 2 | 3 | 4;
  compact?: boolean;
  className?: string;
  /** Announce immediately (role="alert"). Turn off for errors shown on page load. */
  announce?: boolean;
};

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  retrying = false,
  announce = true,
  ...rest
}: ErrorStateProps) {
  const tc = useT(common);
  const ta = useT(apiMessages);
  return (
    <StatePanel
      tone="danger"
      icon="alert"
      title={title ?? tc('errGeneric')}
      description={description === undefined ? ta('errorDescription') : description}
      role={announce ? 'alert' : 'status'}
      actions={
        onRetry && (
          <Button
            variant="secondary"
            onClick={onRetry}
            loading={retrying}
            iconStart={<Icon name="refresh" size={16} />}
          >
            {retryLabel ?? tc('tryAgain')}
          </Button>
        )
      }
      {...rest}
    />
  );
}
