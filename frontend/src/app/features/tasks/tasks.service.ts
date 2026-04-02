import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Task, TaskActivity, TaskFilters, TaskStatus, PaginatedTasks, CreateTaskData, UpdateTaskData } from '../../core/models/task.model';
import { ApiResponse } from '../../core/models/api-response.model';
import { ToastService } from '../../shared/services/toast.service';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  private readonly base = `${environment.apiUrl}/tasks`;

  tasks = signal<Task[]>([]);
  loading = signal(false);
  totalPages = signal(0);
  currentPage = signal(1);
  totalTasks = signal(0);
  filters = signal<TaskFilters>({});
  exportLoading = signal<'csv' | 'pdf' | null>(null);

  loadTasks(filters?: TaskFilters): void {
    const active = filters ?? this.filters();
    this.filters.set(active);
    this.loading.set(true);

    this.http
      .get<ApiResponse<PaginatedTasks>>(this.base, { params: this.buildParams(active) })
      .subscribe({
        next: (res) => {
          this.tasks.set(res.data.tasks);
          this.totalPages.set(res.data.totalPages);
          this.currentPage.set(res.data.page);
          this.totalTasks.set(res.data.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.showError(err, 'Failed to load tasks.');
        },
      });
  }

  createTask(data: CreateTaskData): Observable<void> {
    return this.http.post<ApiResponse<Task>>(this.base, data).pipe(
      tap(() => {
        this.toastService.show('Task created.', 'success');
        this.loadTasks();
      }),
      map(() => void 0),
      catchError((err) => {
        this.showError(err, 'Failed to create task.');
        return throwError(() => err);
      }),
    );
  }

  updateTask(id: string, data: UpdateTaskData): Observable<void> {
    return this.http.patch<ApiResponse<Task>>(`${this.base}/${id}`, data).pipe(
      tap((res) => {
        this.tasks.update(list => list.map(t => t.id === id ? res.data : t));
        this.toastService.show('Task updated.', 'success');
      }),
      map(() => void 0),
      catchError((err) => {
        this.showError(err, 'Failed to update task.');
        return throwError(() => err);
      }),
    );
  }

  updateTaskStatus(id: string, status: TaskStatus): void {
    console.log('updateTaskStatus called with:', id, status);
    // Optimistic update: apply to signal immediately, then sync with server response
    this.tasks.update(list =>
      list.map(t => t.id === id ? { ...t, status } : t)
    );

    this.http.patch<ApiResponse<Task>>(`${this.base}/${id}`, { status }).subscribe({
      next: (res) => {
        // Reconcile with authoritative server data
        this.tasks.update(list => list.map(t => t.id === id ? res.data : t));
      },
      error: (err) => {
        // Roll back optimistic update by reloading
        this.loadTasks();
        this.showError(err, 'Failed to update task status.');
      },
    });
  }

  getTaskActivities(taskId: string): Observable<TaskActivity[]> {
    return this.http
      .get<ApiResponse<TaskActivity[]>>(`${this.base}/${taskId}/activity`)
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          this.showError(err, 'Failed to load activity.');
          return throwError(() => err);
        }),
      );
  }

  deleteTask(id: string): void {
    // Remove immediately for instant UI response
    this.tasks.update(list => list.filter(t => t.id !== id));

    this.http.delete<void>(`${this.base}/${id}`).subscribe({
      next: () => {
        this.toastService.show('Task deleted.', 'success');
        this.totalTasks.update(n => n - 1);
      },
      error: (err) => {
        // Reload to restore removed item
        this.loadTasks();
        this.showError(err, 'Failed to delete task.');
      },
    });
  }

  exportTasks(format: 'csv' | 'pdf'): void {
    this.exportLoading.set(format);

    const { page: _p, limit: _l, ...exportFilters } = this.filters();
    let params = new HttpParams();
    const append = (key: string, value: string | number | undefined) => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    };
    append('status', exportFilters.status);
    append('priority', exportFilters.priority);
    append('labelId', exportFilters.labelId);
    append('search', exportFilters.search);
    append('sortBy', exportFilters.sortBy);
    append('sortOrder', exportFilters.sortOrder);

    this.http
      .get(`${this.base}/export/${format}`, { params, responseType: 'blob' })
      .subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tasks-export.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.exportLoading.set(null);
          this.toastService.show(
            `${format.toUpperCase()} download started.`,
            'success',
          );
        },
        error: (err) => {
          this.exportLoading.set(null);
          this.showError(err, `Failed to export ${format.toUpperCase()}.`);
        },
      });
  }

  private buildParams(filters: TaskFilters): HttpParams {
    let params = new HttpParams();
    const append = (key: string, value: string | number | undefined) => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    };

    append('status', filters.status);
    append('priority', filters.priority);
    append('labelId', filters.labelId);
    append('search', filters.search);
    append('sortBy', filters.sortBy);
    append('sortOrder', filters.sortOrder);
    append('page', filters.page);
    append('limit', filters.limit);

    return params;
  }

  private showError(err: any, fallback: string): void {
    const message = err?.error?.message ?? fallback;
    this.toastService.show(message, 'error');
  }
}
