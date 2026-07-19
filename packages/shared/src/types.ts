export type ExtractedJobData = {
  sourcePlatform: "upwork";
  rawDescription: string;
  clientRating: number | null;
  paymentVerified: "yes" | "no" | "unknown";
  proposalCount: number | null;
  budgetAmount: number | null;
  budgetType: "hourly" | "fixed" | "unknown";
  postedAt: string | null;
  totalClientSpend: number | null;
  clientHireCount: number | null;
  offPlatformFlag: boolean;
  unpaidTestFlag: boolean;
  extractionMethod: "auto_scrape" | "manual_fallback";
};

export type FreelancerProfile = {
  name: string;
  skills: string[];
  yearsExp: number;
  targetRateHourly: number | null;
  targetRateProject: number | null;
  portfolioUrls: string[];
  bio: string;
};

export type DecisionResult = {
  score: number;
  decision: "Apply" | "Caution" | "Skip";
  reason: string;
  factors?: {
    clientQuality: number;
    competition: number;
    budget: number;
    scopeClarity: number;
    skillMatch: number;
  };
};
