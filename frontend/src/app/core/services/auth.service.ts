import { inject, Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { AuthResponse, TokenPayload } from '../models/auth.model';
import { ApiResponse } from '../models/api-response.model';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isLoggedIn = computed(() => !!this.currentUser());

  loadUserFromStorage(): void {
    const token = this.getAccessToken();
    if (!token) return;

    try {
      const payload = this.decodeJwt(token);
      if (payload) {
        // Payload only has userId/email; full user will be fetched lazily if needed.
        // For now seed a minimal user shape so isLoggedIn is truthy.
        this.currentUser.set({ id: String(payload.userId), email: payload.email, name: '', createdAt: '' });
      }
    } catch {
      this.clearTokens();
    }
  }

  register(name: string, email: string, password: string) {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/register`, { name, email, password })
      .pipe(tap(res => this.handleAuthResponse(res.data)));
  }

  login(email: string, password: string) {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.handleAuthResponse(res.data)));
  }

  logout() {
    return this.http
      .post<void>(`${environment.apiUrl}/auth/logout`, {})
      .pipe(
        tap({
          next: () => this.clearAndRedirect(),
          error: () => this.clearAndRedirect(),
        })
      );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  updateProfile(name: string): Observable<User> {
    return this.http
      .patch<ApiResponse<User>>(`${environment.apiUrl}/users/profile`, { name })
      .pipe(
        map(res => res.data),
        tap(user => this.currentUser.update(u => u ? { ...u, ...user } : u)),
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http
      .patch<void>(`${environment.apiUrl}/users/change-password`, { currentPassword, newPassword });
  }

  storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  private handleAuthResponse(data: AuthResponse): void {
    this.storeTokens(data.accessToken, data.refreshToken);
    this.currentUser.set(data.user);
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  private clearAndRedirect(): void {
    this.clearTokens();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private decodeJwt(token: string): TokenPayload | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload)) as TokenPayload;
    } catch {
      return null;
    }
  }
}
