import type { Timestamp } from 'firebase/firestore';

export type UserRole = "CEO" | "SiteLeader";
export type SiteId = string;

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
  revenue: number;
  monthlyGoal: number;
  retention: number;
  nps: number;
  averageTicket: number;
}

export interface DailyReport {
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

export type EvidenceCategory = "reunion" | "preventiva" | "correctiva";

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
}
