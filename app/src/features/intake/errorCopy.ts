import type { ApiRequestError } from '../../shared/api';
import { LIMITS } from '../../shared/contract';

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

export function intakeErrorCopy(error: ApiRequestError): IntakeErrorCopy {
  switch (error.code) {
    case 'TEXT_TOO_LONG':
      return {
        title: 'Text is too long',
        description:
          `The limit is ${LIMIT_TEXT} characters. Your text is still here: shorten it, for example by keeping the symptoms and leaving out dates of visits.`,
        actions: ['shorten'],
      };
    case 'NO_TERMS_FOUND':
      return {
        title: 'No features found in these notes',
        description:
          'We could not match any phrase to a medical feature. Try describing what you see in everyday words, such as "falls a lot" or "big calves", or add features by hand.',
        actions: ['manual'],
      };
    case 'LLM_UNAVAILABLE':
      return {
        title: 'Reading notes is not available here',
        description:
          'This copy of the app cannot read free text right now. Your notes are kept. You can open one of the demo patients, or add features by hand.',
        actions: ['demo', 'manual'],
      };
    case 'UPSTREAM_TIMEOUT':
    case 'TIMEOUT':
      return {
        title: 'Reading the notes took too long',
        description: 'The service did not answer in time. Your notes are kept, so you can try again in a moment.',
        actions: ['retry', 'manual'],
      };
    case 'OFFLINE':
      return {
        title: 'You are offline',
        description: 'Your notes are saved in this browser. Reconnect, then try again.',
        actions: ['retry'],
      };
    default:
      return {
        title: 'The notes could not be read',
        description: error.message,
        actions: error.retryable ? ['retry', 'manual'] : ['manual'],
      };
  }
}
