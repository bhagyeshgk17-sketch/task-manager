import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Label } from '../../core/models/label.model';
import { ApiResponse } from '../../core/models/api-response.model';
import { ToastService } from '../../shared/services/toast.service';

@Injectable({ providedIn: 'root' })
export class LabelsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  private readonly base = `${environment.apiUrl}/labels`;

  labels = signal<Label[]>([]);
  loading = signal(false);

  loadLabels(): void {
    this.loading.set(true);
    this.http.get<ApiResponse<Label[]>>(this.base).subscribe({
      next: (res) => {
        this.labels.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(err, 'Failed to load labels.');
      },
    });
  }

  createLabel(name: string, color: string): void {
    this.http.post<ApiResponse<Label>>(this.base, { name, color }).subscribe({
      next: (res) => {
        this.labels.update(list => [...list, res.data]);
      },
      error: (err) => {
        this.showError(err, 'Failed to create label.');
      },
    });
  }

  updateLabel(id: string, name: string, color: string): void {
    this.http.patch<ApiResponse<Label>>(`${this.base}/${id}`, { name, color }).subscribe({
      next: (res) => {
        this.labels.update(list =>
          list.map(l => l.id === id ? res.data : l)
        );
      },
      error: (err) => {
        this.showError(err, 'Failed to update label.');
      },
    });
  }

  deleteLabel(id: string): void {
    this.http.delete<void>(`${this.base}/${id}`).subscribe({
      next: () => {
        this.labels.update(list => list.filter(l => l.id !== id));
      },
      error: (err) => {
        this.showError(err, 'Failed to delete label.');
      },
    });
  }

  private showError(err: any, fallback: string): void {
    const message = err?.error?.message ?? fallback;
    this.toastService.show(message, 'error');
  }
}
