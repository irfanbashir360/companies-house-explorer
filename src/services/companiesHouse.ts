import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  CompanyProfile,
  SearchResult,
  OfficerSearchResult,
} from '../types';

// Always use the API proxy route (works in both dev and production)
// In development: Vite proxy handles it
// In production: Vercel API route handles it
const BASE_URL = '/api';

class CompaniesHouseAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Search endpoints
  async searchCompanies(query: string, itemsPerPage = 20, startIndex = 0): Promise<SearchResult> {
    const response = await this.client.get('/search/companies', {
      params: {
        q: query,
        items_per_page: itemsPerPage,
        start_index: startIndex,
      },
    });
    return response.data;
  }

  async searchOfficers(query: string, itemsPerPage = 20, startIndex = 0): Promise<OfficerSearchResult> {
    const response = await this.client.get('/search/officers', {
      params: {
        q: query,
        items_per_page: itemsPerPage,
        start_index: startIndex,
      },
    });
    return response.data;
  }

  // Company endpoints
  async getCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
    const response = await this.client.get(`/company/${companyNumber}`);
    return response.data;
  }

  async getCompanyOfficers(companyNumber: string, itemsPerPage = 100, startIndex = 0) {
    const response = await this.client.get(`/company/${companyNumber}/officers`, {
      params: {
        items_per_page: itemsPerPage,
        start_index: startIndex,
      },
    });
    return response.data;
  }

  async getCompanyPSCs(companyNumber: string, itemsPerPage = 100, startIndex = 0) {
    const response = await this.client.get(`/company/${companyNumber}/persons-with-significant-control`, {
      params: {
        items_per_page: itemsPerPage,
        start_index: startIndex,
      },
    });
    return response.data;
  }

  async getCompanyCharges(companyNumber: string, itemsPerPage = 100, startIndex = 0) {
    try {
      const response = await this.client.get(`/company/${companyNumber}/charges`, {
        params: {
          items_per_page: itemsPerPage,
          start_index: startIndex,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { items: [], total_count: 0 };
      }
      throw error;
    }
  }

  async getCompanyFilingHistory(companyNumber: string, itemsPerPage = 100, startIndex = 0) {
    const response = await this.client.get(`/company/${companyNumber}/filing-history`, {
      params: {
        items_per_page: itemsPerPage,
        start_index: startIndex,
      },
    });
    return response.data;
  }

  async getCompanyUKEstablishments(companyNumber: string) {
    try {
      const response = await this.client.get(`/company/${companyNumber}/uk-establishments`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { items: [], total_results: 0 };
      }
      throw error;
    }
  }

  // Officer endpoints
  async getOfficerAppointments(officerId: string, itemsPerPage = 100, startIndex = 0) {
    const response = await this.client.get(`/officers/${officerId}/appointments`, {
      params: {
        items_per_page: itemsPerPage,
        start_index: startIndex,
      },
    });
    return response.data;
  }

  // Fetch all related data for a company
  async getCompanyRelations(companyNumber: string) {
    try {
      const [profile, officers, pscs, charges, filingHistory, establishments] = await Promise.allSettled([
        this.getCompanyProfile(companyNumber),
        this.getCompanyOfficers(companyNumber),
        this.getCompanyPSCs(companyNumber),
        this.getCompanyCharges(companyNumber),
        this.getCompanyFilingHistory(companyNumber, 25),
        this.getCompanyUKEstablishments(companyNumber),
      ]);

      return {
        profile: profile.status === 'fulfilled' ? profile.value : null,
        officers: officers.status === 'fulfilled' ? officers.value : { items: [] },
        pscs: pscs.status === 'fulfilled' ? pscs.value : { items: [] },
        charges: charges.status === 'fulfilled' ? charges.value : { items: [] },
        filingHistory: filingHistory.status === 'fulfilled' ? filingHistory.value : { items: [] },
        establishments: establishments.status === 'fulfilled' ? establishments.value : { items: [] },
      };
    } catch (error) {
      console.error('Error fetching company relations:', error);
      throw error;
    }
  }
}

export const companiesHouseAPI = new CompaniesHouseAPI();
