import React from 'react';
import { NODE_ACCENT, NODE_BORDER, NODE_FILL, RISK_COLOR } from '../theme';
import type { NodeType } from '../types';

/** Small circle matching how the node looks on the graph */
export const NodeGlyph: React.FC<{ type: NodeType; risk?: 'low' | 'medium' | 'high'; size?: number }> = ({
  type,
  risk,
  size = 14,
}) => {
  const ring = risk === 'high' || risk === 'medium' ? RISK_COLOR[risk] : null;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="flex-shrink-0" aria-hidden="true">
      {ring && (
        <circle cx="8" cy="8" r="6.5" fill="none" stroke={ring} strokeWidth="2.2" strokeDasharray={risk === 'medium' ? '3 2' : undefined} />
      )}
      <circle
        cx="8"
        cy="8"
        r={ring ? 4 : 6}
        fill={NODE_FILL[type]}
        stroke={NODE_BORDER[type] ?? (type === 'company' ? 'none' : NODE_ACCENT[type])}
        strokeWidth="1.2"
      />
    </svg>
  );
};
