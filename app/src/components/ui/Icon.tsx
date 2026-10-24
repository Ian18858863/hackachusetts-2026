import type { SVGProps } from 'react';

/**
 * Small inline stroke icon set (24px grid, 1.5px stroke, currentColor).
 * Icons are decorative by default; pass `label` when the icon carries meaning
 * on its own.
 */
const paths = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.75v2M12 19.25v2M4.75 12h-2M21.25 12h-2M6.87 6.87 5.46 5.46M18.54 18.54l-1.41-1.41M6.87 17.13l-1.41 1.41M18.54 5.46l-1.41 1.41" />
    </>
  ),
  moon: <path d="M20.25 14.5A8.25 8.25 0 0 1 9.5 3.75a8.25 8.25 0 1 0 10.75 10.75Z" />,
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
