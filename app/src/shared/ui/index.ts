/** Shared UI for feature folders. Import from "../../shared/ui". */
export { AnnouncerProvider, useAnnounce } from './Announcer';
export { AppFooter } from './AppFooter';
export { DataOriginLabel, DemoCacheLabel, DemoCaseLabel, OfflineMockLabel } from './DemoLabel';
export { Disclaimer } from './Disclaimer';
export { FeatureStub } from './FeatureStub';
export { ApiErrorState, LoadingPanel, OfflineNotice, useOnlineStatus } from './states';

// Primitives, re-exported so features have one import path.
export {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  SkeletonGroup,
  SkeletonText,
  Spinner,
  type IconName,
} from '../../components/ui';
