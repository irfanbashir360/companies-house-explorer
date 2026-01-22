// Node types in the graph
export type NodeType = 'company' | 'officer' | 'psc' | 'charge' | 'filing' | 'establishment';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  data: any;
  expanded: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Filter types
export interface FilterState {
  companies: boolean;
  officers: boolean;
  pscs: boolean;
  charges: boolean;
  filings: boolean;
  establishments: boolean;
}

// History types
export interface SearchHistoryItem {
  id: string;
  query: string;
  type: 'company' | 'officer';
  timestamp: number;
  result?: {
    id: string;
    name: string;
  };
}

// Companies House API Types
export interface CompanyProfile {
  company_number: string;
  company_name: string;
  company_status: string;
  type: string;
  registered_office_address?: Address;
  date_of_creation?: string;
  jurisdiction?: string;
  sic_codes?: string[];
  accounts?: any;
  annual_return?: any;
}

export interface Address {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

export interface Officer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  occupation?: string;
  date_of_birth?: {
    month: number;
    year: number;
  };
  address?: Address;
  links?: {
    officer?: {
      appointments?: string;
    };
  };
}

export interface OfficerAppointment {
  name: string;
  appointed_to?: {
    company_name: string;
    company_number: string;
    company_status: string;
  };
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
}

export interface PSC {
  name: string;
  name_elements?: {
    forename?: string;
    surname?: string;
    title?: string;
  };
  nationality?: string;
  country_of_residence?: string;
  natures_of_control?: string[];
  notified_on?: string;
  ceased_on?: string;
  address?: Address;
  date_of_birth?: {
    month: number;
    year: number;
  };
  kind: string;
}

export interface Charge {
  charge_code?: string;
  charge_number?: number;
  classification?: {
    type: string;
    description: string;
  };
  created_on?: string;
  delivered_on?: string;
  status?: string;
  persons_entitled?: Array<{
    name: string;
  }>;
  particulars?: {
    description?: string;
    type?: string;
  };
}

export interface FilingHistoryItem {
  transaction_id: string;
  type: string;
  description: string;
  date: string;
  category: string;
  action_date?: string;
  paper_filed?: boolean;
  links?: {
    self: string;
    document_metadata?: string;
  };
}

export interface SearchResult {
  items: Array<{
    company_number: string;
    company_name: string;
    company_status: string;
    company_type: string;
    address_snippet?: string;
    date_of_creation?: string;
  }>;
  total_results: number;
  items_per_page: number;
  start_index: number;
}

export interface OfficerSearchResult {
  items: Array<{
    title: string;
    description: string;
    address_snippet?: string;
    appointment_count?: number;
    date_of_birth?: {
      month: number;
      year: number;
    };
    links?: {
      self: string;
    };
  }>;
  total_results: number;
}
