import type { NodeType } from './types';

// Tracewire palette (drawn from the LexisNexis UK site). Keep in sync with tailwind.config.js.
export const COLOR = {
  ink: '#00172E',
  nexis: '#006EBB',
  nexisWash: '#E0F2FF',
  teal: '#2F9191',
  tealWash: '#DCF5F5',
  alert: '#E8171F',
  amber: '#E07B00',
  line: '#E5EBF0',
  muted: '#455A64',
  linkGrey: '#C5D0DA',
} as const;

// Fill, icon/accent and border colour for each node type
export const NODE_FILL: Record<NodeType, string> = {
  company: COLOR.ink,
  officer: COLOR.nexisWash,
  psc: COLOR.tealWash,
  charge: '#FEF3C7',
  filing: '#D1FAE5',
  establishment: '#CFFAFE',
};
export const NODE_ACCENT: Record<NodeType, string> = {
  company: '#FFFFFF',
  officer: COLOR.nexis,
  psc: COLOR.teal,
  charge: '#B45309',
  filing: '#047857',
  establishment: '#0E7490',
};
export const NODE_BORDER: Partial<Record<NodeType, string>> = {
  officer: '#9CCBEB',
  psc: '#8CC9C9',
  charge: '#FCD34D',
  filing: '#6EE7B7',
  establishment: '#67E8F9',
};

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  company: 'Company',
  officer: 'Officer',
  psc: 'Person with significant control',
  charge: 'Charge',
  filing: 'Filing',
  establishment: 'UK establishment',
};

export const RISK_COLOR = { high: COLOR.alert, medium: COLOR.amber } as const;
