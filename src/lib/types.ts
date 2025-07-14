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
  documentId?: string;
  status?: 'active' | 'inactive';
}

export interface Site {
  id: SiteId;
  name:string;
  revenue: number;
  monthlyGoal: number;
  retention: number;
  nps: number;
  spreadsheetId?: string;
  spreadsheetGid?: string;
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
  monthlyGoal: number;
}

export type TaskFrequency = 'daily' | 'weekly' | 'monthly';

export interface TaskTemplate {
    id: string;
    title: string;
    description: string;
    frequency: TaskFrequency;
    // assignedSiteIds: SiteId[] | 'all'; // For future use
    createdBy: string; // User.uid
    createdAt: Timestamp;
    isActive: boolean;
}

export interface TaskInstance {
    id: string;
    templateId: string;
    siteId: SiteId;
    dueDate: Timestamp;
    status: 'pending' | 'completed' | 'overdue';
    completedAt?: Timestamp;
    completedBy?: string; // User.uid
    notes?: string;
    evidenceUrl?: string;
}
