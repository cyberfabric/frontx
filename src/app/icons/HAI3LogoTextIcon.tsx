import React from 'react';

/**
 * HAI3 Logo Text Icon
 * App-level branding text used by Menu layout component
 */
export const HAI3LogoTextIcon: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 24"
      fill="currentColor"
    >
      <path d="M1 5.98 l4.64 0 l0 5.44 l4.34 0 l0 -5.44 l4.64 0 l0 14.02 l-4.64 0 l0 -5.06 l-4.34 0 l0 5.06 l-4.64 0 l0 -14.02 z"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M27.329500000000003 20 l-0.7 -1.98 l-5.26 0 l-0.72 1.98 l-4.76 0 l5.92 -14.02 l4.76 0 l5.7 14.02 l-4.94 0 z M22.5695 14.7 l2.92 0 l-1.44 -4.1 z"/>
      <path d="M33.539 5.98 l4.64 0 l0 14.02 l-4.64 0 l0 -14.02 z"/>
      <path opacity="0.7" d="M50.5985 12.969999999999999 q0.91 1.03 0.91 2.57 q0 1.36 -0.72 2.42 t-2.04 1.65 t-3.08 0.59 q-1.62 0 -3.2 -0.51 t-2.66 -1.35 l1.64 -3.12 q1.86 1.56 3.84 1.56 q1.68 0 1.68 -1.24 q0 -0.6 -0.42 -0.93 t-1.26 -0.33 l-2.62 0 l0 -2.4 l2.72 -2.58 l-4.82 0 l0 -3.34 l10.26 0 l0 2.62 l-3.3 2.9 l0.66 0.14 q1.5 0.32 2.41 1.35 z"/>
    </svg>
  );
};
