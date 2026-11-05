import React from 'react';

/** Tracewire mark: a company hub with the people connected to it. */
export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    className={className}
    role="img"
    aria-label="Tracewire logo"
  >
    <rect width="32" height="32" rx="8" fill="#00172E" />
    <g stroke="#6FA8CF" strokeWidth="1.6">
      <line x1="16" y1="16" x2="8" y2="9" />
      <line x1="16" y1="16" x2="24" y2="10" />
      <line x1="16" y1="16" x2="22" y2="24" />
      <line x1="16" y1="16" x2="9" y2="23" />
    </g>
    <circle cx="16" cy="16" r="4" fill="#ffffff" />
    <circle cx="8" cy="9" r="2.6" fill="#51B5FC" />
    <circle cx="24" cy="10" r="2.6" fill="#51B5FC" />
    <circle cx="22" cy="24" r="2.6" fill="#5CC2C2" />
    <circle cx="9" cy="23" r="2.6" fill="#51B5FC" />
  </svg>
);
