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

/**
 * Empty dashboard stats for error/loading states
 */
export const EMPTY_DASHBOARD_STATS: DashboardStats = {
    projectStats: [],
    timeStats: [],
    passRates: [],
    kpi: {
        avgTimeToTest: 0,
        firstTimePassRate: 0,
        issuesFound: 0,
        activeTests: 0,
    },
};

