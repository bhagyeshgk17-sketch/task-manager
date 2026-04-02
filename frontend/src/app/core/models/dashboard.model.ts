export interface DashboardData {
  totalTasks: number;
  byStatus: {
    todo: number;
    inProgress: number;
    done: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
  };
  overdueCount: number;
  dueTodayCount: number;
  completionRate: number;
  subtaskStats: {
    total: number;
    completed: number;
  };
}
