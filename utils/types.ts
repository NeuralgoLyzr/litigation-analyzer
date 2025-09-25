/* eslint-disable @typescript-eslint/no-explicit-any */


export interface Company {
  name: string;
  websiteUrl: string;
  linkedinUrl: string;
}

export interface ProcessedCompany extends Company {
  status: 'pass' | 'fail';
  reason?: string;
}

export interface BatchJob {
  jobId: string;
  totalCompanies: number;
  processedCount: number;
  results: ProcessedCompany[];
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  startTime: Date;
  lastUpdated: Date;
}



// types.ts

export interface FinancialData {
  FinancialAnalysis: {
    Statements: {
      IncomeStatement: string;
      BalanceSheet: string;
      CashFlow: string;
    };
    };
  MarketAnalysis: {
    StockPerformance: string;
    CompetitivePositioning: string;
    IndustryTrends: string;
  };
  RecentDevelopments: string;
  Insights: string;
}

export interface ManagementProfile {
  roleData: [{
    name: string;
    position: string;
    description: string;
  }]
}

export interface CompanyOverview {
  company_name: string;
  description: string;
  year_of_establishment: number;
  employee_count: string;
  industries: string[];
  key_products_or_services: string[];
  headquarters: string;
  global_locations: string[];
  significant_milestones: Array<{
    year: number;
    event: string;
  }>;
  competitor_analysis: Array<{
    competitor_name: string;
    key_differences: string;
  }>;
  reliability: string;
}

export interface LegalMatter {
  issues: [{
    year: string;
    details: string;
  }]
}

export interface ResearchData {
  financialData: FinancialData;
  managementData: ManagementProfile;
  companyOverview: CompanyOverview;
  legalMatters: LegalMatter;
}

export interface ResearchJob {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  results?: ResearchData;
  error?: string;
  startTime: Date;
  lastUpdated: Date;
}


export type SearchType = 'name' | 'criteria';

export interface Company {
  name: string;
  websiteUrl: string;
  linkedinUrl: string;
  researchData?: any;
  researchStatus?: 'pending' | 'completed' | 'failed';
  id?: string;
  dateAdded?: string;
  isProcessing?: boolean;
}

export interface StepStatus {
  similarityProfile: 'pending' | 'completed' | 'failed';
  searchCriteria: 'pending' | 'completed' | 'failed';
  criteriaJson: 'pending' | 'completed' | 'failed';
  companySearch: 'pending' | 'completed' | 'failed';
}

export interface SearchResponse {
  success: boolean;
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  currentStep: keyof StepStatus;
  stepStatuses: StepStatus;
  results?: Company[];
  error?: string;
}