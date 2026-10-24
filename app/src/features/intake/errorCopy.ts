import type { ApiRequestError } from '../../shared/api';
import { LIMITS } from '../../shared/contract';
import type { FormatVars, MessageKey } from '../../shared/i18n';
import type common from '../../shared/i18n/messages/common';
import type intake from '../../shared/i18n/messages/intake';

const LIMIT_TEXT = LIMITS.notesMaxChars.toLocaleString('en-US');

/**
 * Plain, kind wording for extraction errors on the Notes step, by contract
 * error code (docs/CONTRACT.md sections 4 and 7.2). The server's own message
 * is already safe to show, so it is used as the description whenever the
 * code has no specific wording here.
 */
export type IntakeNextAction = 'retry' | 'demo' | 'manual' | 'shorten';

export interface IntakeErrorCopy {
  title: string;
  description: string;
  actions: IntakeNextAction[];
}

type Translate<M> = (key: MessageKey<M>, vars?: FormatVars) => string;

export function intakeErrorCopy(
  error: ApiRequestError,
  t: Translate<typeof intake>,
  tc: Translate<typeof common>,
): IntakeErrorCopy {
  switch (error.code) {
    case 'TEXT_TOO_LONG':
      return {
        title: tc('errTextTooLong'),
        description: t('errTooLongText', { max: LIMIT_TEXT }),
        actions: ['shorten'],
      };
    case 'NO_TERMS_FOUND':
      return {
        title: t('errNoTermsTitle'),
        description: t('errNoTermsText'),
        actions: ['manual'],
      };
    case 'LLM_UNAVAILABLE':
      return {
        title: tc('errLlmUnavailable'),
        description: t('errLlmText'),
        actions: ['demo', 'manual'],
      };
    case 'UPSTREAM_TIMEOUT':
    case 'TIMEOUT':
      return {
        title: t('errTimeoutTitle'),
        description: t('errTimeoutText'),
        actions: ['retry', 'manual'],
      };
    case 'OFFLINE':
      return {
        title: tc('errOffline'),
        description: t('errOfflineText'),
        actions: ['retry'],
      };
    default:
      return {
        title: t('errDefaultTitle'),
        description: error.message,
        actions: error.retryable ? ['retry', 'manual'] : ['manual'],
      };
  }
}
