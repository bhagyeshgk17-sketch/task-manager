import { Injectable, computed, inject, signal, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  taskId?: string;
  taskTitle?: string;
  count?: number;
  createdAt: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
  private authService = inject(AuthService);
  private socket: Socket | null = null;

  notifications = signal<AppNotification[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  connect(): void {
    if (this.socket?.connected) return;

    const token = this.authService.getAccessToken();
    if (!token) return;

    // Step 1 — include polling as fallback so the handshake always succeeds
    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    // Step 7 — connection lifecycle logging
    this.socket.on('connect', () =>
      console.log('WebSocket connected:', this.socket?.id),
    );
    this.socket.on('connect_error', (err) =>
      console.error('WebSocket connection error:', err.message),
    );
    this.socket.on('disconnect', (reason) =>
      console.log('WebSocket disconnected:', reason),
    );

    // Step 2 — exact event name 'notification' matches backend gateway
    // Step 3 — log payload so DevTools confirms arrival
    this.socket.on('notification', (data: Omit<AppNotification, 'read'>) => {
      console.log('Notification received:', data);
      this.notifications.update(prev =>
        [{ ...data, read: false }, ...prev].slice(0, 50),
      );
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  markAsRead(id: string): void {
    this.notifications.update(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  markAllAsRead(): void {
    this.notifications.update(prev => prev.map(n => ({ ...n, read: true })));
  }

  clearAll(): void {
    this.notifications.set([]);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
