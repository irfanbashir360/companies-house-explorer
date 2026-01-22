import type { GraphData, GraphNode, GraphLink } from '../types';

export interface SharedOfficerConnection {
  companies: [string, string]; // Company IDs
  officer: string; // Officer name
  officerIds: string[];
}

export interface ShellCompanyAnalysis {
  companyId: string;
  companyName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
}

export interface NetworkAnalysis {
  sharedOfficerConnections: SharedOfficerConnection[];
  shellCompanyRisks: ShellCompanyAnalysis[];
  suspiciousLinks: GraphLink[];
  stats: {
    totalSharedConnections: number;
    highRiskCompanies: number;
    mediumRiskCompanies: number;
  };
}

// Detect companies that share officers
export function findSharedOfficerConnections(graphData: GraphData): SharedOfficerConnection[] {
  const connections: SharedOfficerConnection[] = [];

  // Group officers by normalized name
  const officersByName = new Map<string, GraphNode[]>();
  graphData.nodes
    .filter(n => n.type === 'officer')
    .forEach(officer => {
      const normalizedName = officer.label.toLowerCase().trim();
      if (!officersByName.has(normalizedName)) {
        officersByName.set(normalizedName, []);
      }
      officersByName.get(normalizedName)!.push(officer);
    });

  // For each officer group, find connected companies
  officersByName.forEach((officers, name) => {
    if (officers.length === 1) return; // Only one instance, skip

    // Find all companies connected to these officers
    const companyIds = new Set<string>();
    officers.forEach(officer => {
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;

        if (sourceId === officer.id && targetId.startsWith('company-')) {
          companyIds.add(targetId);
        }
        if (targetId === officer.id && sourceId.startsWith('company-')) {
          companyIds.add(sourceId);
        }
      });
    });

    // Create connections between companies
    const companies = Array.from(companyIds);
    for (let i = 0; i < companies.length; i++) {
      for (let j = i + 1; j < companies.length; j++) {
        connections.push({
          companies: [companies[i], companies[j]],
          officer: officers[0].label,
          officerIds: officers.map(o => o.id),
        });
      }
    }
  });

  return connections;
}

// Analyze company for shell company risk indicators
export function analyzeShellCompanyRisk(company: GraphNode, graphData: GraphData): ShellCompanyAnalysis {
  let riskScore = 0;
  const flags: string[] = [];

  // Get connected nodes
  const officers = getConnectedNodes(graphData, company.id, 'officer');
  const pscs = getConnectedNodes(graphData, company.id, 'psc');
  const data = company.data || {};

  // 1. No PSCs (High Risk - 5 points)
  if (pscs.length === 0 && data.company_status === 'active') {
    riskScore += 5;
    flags.push('No beneficial owners listed');
  }

  // 2. Minimal officers (Medium Risk - 2 points)
  if (officers.length < 2 && data.company_status === 'active') {
    riskScore += 2;
    flags.push(`Only ${officers.length} officer(s)`);
  }

  // 3. Professional directors (High Risk - 3 points per officer)
  let professionalDirectorCount = 0;
  officers.forEach(officer => {
    const appointmentCount = officer.data?.appointment_count || 0;
    if (appointmentCount > 50) {
      professionalDirectorCount++;
      riskScore += 3;
    }
  });
  if (professionalDirectorCount > 0) {
    flags.push(`${professionalDirectorCount} officer(s) with 50+ appointments`);
  }

  // 4. Dormant/Dissolved status (Medium Risk - 2 points)
  if (data.company_status === 'dormant') {
    riskScore += 2;
    flags.push('Company is dormant');
  } else if (data.company_status === 'dissolved') {
    riskScore += 1;
    flags.push('Company dissolved');
  }

  // 5. Recent incorporation (Low Risk - 1 point)
  if (data.date_of_creation) {
    const creationDate = new Date(data.date_of_creation);
    const monthsOld = (Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsOld < 6 && data.company_status === 'active') {
      riskScore += 1;
      flags.push('Recently incorporated (< 6 months)');
    }
  }

  // 6. Multiple companies share officers (Medium Risk - 2 points)
  const sharedConnections = findSharedOfficerConnections(graphData);
  const companiesWithSharedOfficers = sharedConnections.filter(
    conn => conn.companies.includes(company.id)
  );
  if (companiesWithSharedOfficers.length > 2) {
    riskScore += 2;
    flags.push(`Shares officers with ${companiesWithSharedOfficers.length} companies`);
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore >= 8) {
    riskLevel = 'high';
  } else if (riskScore >= 4) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    companyId: company.id,
    companyName: company.label,
    riskScore,
    riskLevel,
    flags,
  };
}

// Get all nodes connected to a specific node
function getConnectedNodes(graphData: GraphData, nodeId: string, nodeType?: string): GraphNode[] {
  const connectedIds = new Set<string>();

  graphData.links.forEach(link => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    if (sourceId === nodeId) {
      connectedIds.add(targetId);
    } else if (targetId === nodeId) {
      connectedIds.add(sourceId);
    }
  });

  return graphData.nodes.filter(
    n => connectedIds.has(n.id) && (!nodeType || n.type === nodeType)
  );
}

// Perform full network analysis
export function analyzeNetwork(graphData: GraphData): NetworkAnalysis {
  // Find shared officer connections
  const sharedOfficerConnections = findSharedOfficerConnections(graphData);

  // Analyze all companies for shell company risk
  const companies = graphData.nodes.filter(n => n.type === 'company');
  const shellCompanyRisks = companies.map(company =>
    analyzeShellCompanyRisk(company, graphData)
  );

  // Create suspicious links (red lines between companies with shared officers)
  const suspiciousLinks: GraphLink[] = sharedOfficerConnections.map(conn => ({
    source: conn.companies[0],
    target: conn.companies[1],
    type: 'shared-officer',
    label: `Shared: ${conn.officer}`,
  }));

  // Calculate stats
  const highRiskCompanies = shellCompanyRisks.filter(r => r.riskLevel === 'high').length;
  const mediumRiskCompanies = shellCompanyRisks.filter(r => r.riskLevel === 'medium').length;

  return {
    sharedOfficerConnections,
    shellCompanyRisks,
    suspiciousLinks,
    stats: {
      totalSharedConnections: sharedOfficerConnections.length,
      highRiskCompanies,
      mediumRiskCompanies,
    },
  };
}
