import type { SVGProps } from 'react';

/**
 * Icons the shared set does not have yet, drawn on the same 24px grid with a
 * 1.5px stroke in currentColor. Decorative only. If other features need them,
 * they should move into components/ui/Icon.tsx (a shared-file change).
 */
const paths = {
  close: <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />,
  search: (
    <>
      <circle cx="10.75" cy="10.75" r="6.25" />
      <path d="m15.5 15.5 4.25 4.25" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14.25 4.75 10 9 5.75" />
      <path d="M4.75 10h9.5a5 5 0 0 1 0 10H11" />
    </>
  ),
} as const;

export type LocalIconName = keyof typeof paths;

export function LocalIcon({
  name,
  size = 16,
  ...rest
}: Omit<SVGProps<SVGSVGElement>, 'children'> & { name: LocalIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
