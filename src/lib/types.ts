import type { Timestamp } from 'firebase/firestore';

export type UserRole = "CEO" | "SiteLeader";
export type SiteId = string;

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  siteId: SiteId | null;
  photoURL?: string;
}

export interface Site {
  id: SiteId;
  name:string;
  revenue: number;
  monthlyGoal: number;
  retention: number;
  nps: number;
  averageTicket: number;
  spreadsheetId?: string;
  npsLastUpdatedAt?: Timestamp;
}

export interface DailyReport {
  id: string;
  siteId: SiteId;
  leaderId: string;
  leaderName: string;
  date: string; // YYYY-MM-DD
  newRevenue: number;
  renewalRate: number;
  dailyWin: string;
  dailyChallenge: string;
  lessonLearned: string;
  submittedAt: Timestamp;
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
  createdAt: Timestamp;
}

export type EvidenceCategory = "reunion" | "preventiva" | "correctiva" | "complementario";

export interface EvidenceDocument {
  id: string;
  siteId: SiteId;
  leaderId: string;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileType: "image" | "pdf";
  category: EvidenceCategory;
  uploadedAt: Timestamp;
  oneOnOneSessionId?: string;
}

export interface MonthlyHistory {
  siteId: SiteId;
  siteName: string;
  year: number;
  month: number; // 1-12
  finalRevenue: number;
  finalRetention: number;
  finalNps: number;
  finalAverageTicket: number;
  monthlyGoal: number;
}
