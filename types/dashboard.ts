/**
 * Dashboard-related types
 */

export interface ProjectStat {
    name: string;
    open: number;
    closed: number;
}

export interface TimeStat {
    date: string;
    minutes: number;
}

export interface PassRateStat {
    name: string;
    value: number;
    color: string;
}

export interface DashboardKPI {
    avgTimeToTest: number;
    firstTimePassRate: number;
    issuesFound: number;
    activeTests: number;
    avgWaitTime: number; // Average time issues wait in Ready for QA (in minutes)
}

export interface DashboardStats {
    projectStats: ProjectStat[];
    timeStats: TimeStat[];
    passRates: PassRateStat[];
    kpi: DashboardKPI;
}

