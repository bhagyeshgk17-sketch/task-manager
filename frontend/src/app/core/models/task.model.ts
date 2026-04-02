import { Label } from './label.model';
import { Subtask } from './subtask.model';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  labels: Label[];
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTasks {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CreateTaskData = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  labelIds?: string[];
};

export type UpdateTaskData = {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  labelIds?: string[];
};

export type TaskActivityAction =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'TITLE_UPDATED'
  | 'DESCRIPTION_UPDATED'
  | 'DUE_DATE_CHANGED'
  | 'LABEL_ADDED'
  | 'LABEL_REMOVED'
  | 'DELETED';

export interface TaskActivity {
  id: string;
  action: TaskActivityAction;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  labelId?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}
