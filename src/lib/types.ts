export type UserRole = "CEO" | "SiteLeader";
export type SiteId = "ciudadela" | "floridablanca" | "piedecuesta";

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  siteId: SiteId | null;
}

export interface Site {
  id: SiteId;
  name: string;
  revenueGoal: number;
}

export interface WeeklyReport {
  id: string;
  siteId: SiteId;
  leaderId: string;
  leaderName: string;
  date: string; // YYYY-MM-DD
  newRevenue: number;
  newMembers: number;
  lostMembers: number;
  renewalRate: number;
  avgNPS: number;
  coachSatisfaction: number;
  weeklyWin: string;
  weeklyChallenge: string;
  lessonLearned: string;
  submittedAt: Date;
}

export type EmployeeRole = "Coach" | "SalesAdvisor";

export interface OneOnOneSession {
  id: string;
  siteId: SiteId;
  leaderId: string;
  employeeName: string;
  employeeRole: EmployeeRole;
  sessionDate: string; // YYYY-MM-DD
  energyCheckIn: number;
  mainWin: string;
  opportunityForImprovement: string;
  actionPlan: string;
  createdAt: Date;
}

export type ProposalStatus = "pending" | "approved" | "rejected";

export interface MarketingProposal {
  id: string;
  siteId: SiteId;
  leaderId: string;
  initiativeName: string;
  objective: string;
  proposedAction: string;
  budget: number;
  successKPIs: string;
  status: ProposalStatus;
  ceoFeedback?: string;
  submittedAt: Date;
}
