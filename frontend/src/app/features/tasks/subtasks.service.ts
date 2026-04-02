import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Subtask } from '../../core/models/subtask.model';
import { ApiResponse } from '../../core/models/api-response.model';
import { ToastService } from '../../shared/services/toast.service';

@Injectable({ providedIn: 'root' })
export class SubtasksService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  private readonly base = `${environment.apiUrl}/tasks`;

  addSubtask(taskId: string, title: string): Observable<Subtask> {
    return this.http
      .post<ApiResponse<Subtask>>(`${this.base}/${taskId}/subtasks`, { title })
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          this.toastService.show(
            err?.error?.message ?? 'Failed to add subtask.',
            'error',
          );
          return throwError(() => err);
        }),
      );
  }

  updateSubtask(
    taskId: string,
    subtaskId: string,
    data: { title?: string; isCompleted?: boolean },
  ): Observable<Subtask> {
    return this.http
      .patch<ApiResponse<Subtask>>(
        `${this.base}/${taskId}/subtasks/${subtaskId}`,
        data,
      )
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          this.toastService.show(
            err?.error?.message ?? 'Failed to update subtask.',
            'error',
          );
          return throwError(() => err);
        }),
      );
  }

  deleteSubtask(taskId: string, subtaskId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${taskId}/subtasks/${subtaskId}`)
      .pipe(
        map(() => void 0),
        catchError((err) => {
          this.toastService.show(
            err?.error?.message ?? 'Failed to delete subtask.',
            'error',
          );
          return throwError(() => err);
        }),
      );
  }

  reorderSubtasks(taskId: string, subtaskIds: string[]): Observable<void> {
    return this.http
      .patch<void>(`${this.base}/${taskId}/subtasks/reorder`, { subtaskIds })
      .pipe(
        map(() => void 0),
        catchError((err) => {
          this.toastService.show(
            err?.error?.message ?? 'Failed to reorder subtasks.',
            'error',
          );
          return throwError(() => err);
        }),
      );
  }
}
