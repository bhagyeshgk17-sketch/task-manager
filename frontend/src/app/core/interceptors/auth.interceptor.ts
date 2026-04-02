import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { throwError, BehaviorSubject, Observable } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../models/api-response.model';
import { AuthResponse } from '../models/auth.model';

// Module-level state for token refresh coordination across concurrent requests.
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const http = inject(HttpClient);

  return next(attachToken(req, authService.getAccessToken())).pipe(
    catchError((error: HttpErrorResponse) => {
      const isRefreshUrl = req.url.includes('/auth/refresh');
      if (error.status === 401 && !isRefreshUrl) {
        return handle401(req, next, authService, http);
      }
      return throwError(() => error);
    })
  );
};

function attachToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  http: HttpClient
): Observable<any> {
  if (isRefreshing) {
    // Queue concurrent requests until the new token is ready.
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => next(attachToken(req, token)))
    );
  }

  isRefreshing = true;
  refreshTokenSubject.next(null);

  const refreshToken = authService.getRefreshToken();
  if (!refreshToken) {
    isRefreshing = false;
    authService.logout().subscribe();
    return throwError(() => new Error('No refresh token'));
  }

  return http
    .post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
    .pipe(
      switchMap(res => {
        isRefreshing = false;
        const { accessToken, refreshToken: newRefresh } = res.data;
        authService.storeTokens(accessToken, newRefresh);
        refreshTokenSubject.next(accessToken);
        return next(attachToken(req, accessToken));
      }),
      catchError(err => {
        isRefreshing = false;
        authService.logout().subscribe();
        return throwError(() => err);
      })
    );
}
