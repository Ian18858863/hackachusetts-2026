import type { SVGProps } from 'react';

/**
 * Small inline stroke icon set (24px grid, 1.5px stroke, currentColor).
 * Icons are decorative by default; pass `label` when the icon carries meaning
 * on its own.
 */
const paths = {
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.6-4.5M4 13a8 8 0 0 0 14.6 4.5" />
      <path d="M5 3v3.75h3.75M19 21v-3.75h-3.75" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 10v4.25M12 17.25v.01" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5 6 5.5h12l2.5 8v5h-17v-5Z" />
      <path d="M3.5 13.5h5l1 2h5l1-2h5" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  flask: (
    <>
      <path d="M9.5 3.75h5M10.25 3.75v5.5L5.4 17.6A1.75 1.75 0 0 0 6.9 20.25h10.2a1.75 1.75 0 0 0 1.5-2.65l-4.85-8.35v-5.5" />
      <path d="M7.75 14.25h8.5" />
    </>
  ),
  cloudOff: (
    <>
      <path d="M7.5 18.25h9.75a3.75 3.75 0 0 0 .9-7.39A5.5 5.5 0 0 0 8.4 8.1M5.6 9.6A4.25 4.25 0 0 0 7.5 18.25" />
      <path d="m3.75 3.75 16.5 16.5" />
    </>
  ),
  external: (
    <>
      <path d="M13.5 4.75h5.75v5.75M19.25 4.75 11 13" />
      <path d="M17.25 13.5v4.25a1.5 1.5 0 0 1-1.5 1.5H6.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h4.25" />
    </>
  ),
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  notes: (
    <>
      <path d="M6.75 3.75h7.5l4 4v11.5a1 1 0 0 1-1 1H6.75a1 1 0 0 1-1-1v-14.5a1 1 0 0 1 1-1Z" />
      <path d="M9 12h6M9 15.5h6M9 8.5h3" />
    </>
  ),
  list: <path d="M9 7h10.25M9 12h10.25M9 17h10.25M4.75 7h.01M4.75 12h.01M4.75 17h.01" />,
  compare: (
    <>
      <path d="M4.75 6.75h8.5M4.75 12h14.5M4.75 17.25h5.5" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M9.75 9.5a2.25 2.25 0 1 1 3.1 2.08c-.5.2-.85.68-.85 1.22v.45M12 16v.01" />
    </>
  ),
  document: (
    <>
      <path d="M6.75 3.75h7.5l4 4v11.5a1 1 0 0 1-1 1H6.75a1 1 0 0 1-1-1v-14.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.75v4.25h4.25" />
    </>
  ),
  trial: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 1.75" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: IconName;
  size?: number;
  label?: string;
};

export function Icon({ name, size = 20, label, ...rest }: IconProps) {
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
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
