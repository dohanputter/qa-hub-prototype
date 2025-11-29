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
}

export interface DashboardStats {
    projectStats: ProjectStat[];
    timeStats: TimeStat[];
    passRates: PassRateStat[];
    kpi: DashboardKPI;
}

