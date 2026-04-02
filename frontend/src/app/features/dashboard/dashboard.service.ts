import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DashboardData } from '../../core/models/dashboard.model';
import { ApiResponse } from '../../core/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getDashboardData(): Observable<DashboardData> {
    return this.http
      .get<ApiResponse<DashboardData>>(`${environment.apiUrl}/tasks/dashboard`)
      .pipe(map(res => res.data));
  }
}
