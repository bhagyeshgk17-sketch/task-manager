import { Component, inject, signal, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationsService, AppNotification } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe],
  template: `
    <div class="bell-wrapper">
      <button
        class="bell-btn"
        type="button"
        (click)="toggleDropdown()"
        [attr.aria-label]="notificationsService.unreadCount() + ' unread notifications'"
      >
        <svg class="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        @if (notificationsService.unreadCount() > 0) {
          <span class="bell-badge">
            {{ notificationsService.unreadCount() > 99 ? '99+' : notificationsService.unreadCount() }}
          </span>
        }
      </button>

      @if (open()) {
        <div class="dropdown">
          <div class="dropdown__header">
            <span class="dropdown__title">Notifications</span>
            @if (notificationsService.notifications().length > 0) {
              <div class="dropdown__actions">
                <button class="dropdown__action-btn" (click)="notificationsService.markAllAsRead()">
                  Mark all read
                </button>
                <button class="dropdown__action-btn dropdown__action-btn--danger" (click)="notificationsService.clearAll()">
                  Clear all
                </button>
              </div>
            }
          </div>

          <div class="dropdown__body">
            @if (notificationsService.notifications().length === 0) {
              <div class="dropdown__empty">No notifications</div>
            } @else {
              @for (notification of notificationsService.notifications(); track notification.id) {
                <div
                  class="notification-item"
                  [class.notification-item--unread]="!notification.read"
                  (click)="notificationsService.markAsRead(notification.id)"
                >
                  <div class="notification-item__dot"
                       [class.notification-item__dot--overdue]="notification.type === 'OVERDUE'">
                  </div>
                  <div class="notification-item__content">
                    <p class="notification-item__message">{{ notification.message }}</p>
                    <span class="notification-item__time">
                      {{ notification.createdAt | date:'shortTime' }}
                    </span>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .bell-wrapper {
      position: relative;
    }

    .bell-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      cursor: pointer;
      color: var(--text-secondary);
      transition: background 0.15s, border-color 0.15s;
      flex-shrink: 0;
    }

    .bell-btn:hover {
      background: var(--bg-secondary);
    }

    .bell-icon {
      width: 16px;
      height: 16px;
    }

    .bell-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: #ef4444;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      box-sizing: border-box;
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 320px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      z-index: 200;
      overflow: hidden;
    }

    .dropdown__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .dropdown__title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .dropdown__actions {
      display: flex;
      gap: 8px;
    }

    .dropdown__action-btn {
      font-size: 12px;
      font-weight: 500;
      color: var(--accent-color);
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .dropdown__action-btn:hover {
      background: var(--bg-secondary);
    }

    .dropdown__action-btn--danger {
      color: #ef4444;
    }

    .dropdown__body {
      max-height: 320px;
      overflow-y: auto;
    }

    .dropdown__empty {
      padding: 24px 16px;
      text-align: center;
      font-size: 14px;
      color: var(--text-muted);
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.15s;
      border-bottom: 1px solid var(--border-color);
    }

    .notification-item:last-child {
      border-bottom: none;
    }

    .notification-item:hover {
      background: var(--bg-secondary);
    }

    .notification-item--unread {
      background: color-mix(in srgb, var(--accent-color) 5%, var(--bg-card));
    }

    .notification-item__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-color);
      flex-shrink: 0;
      margin-top: 5px;
    }

    .notification-item__dot--overdue {
      background: #ef4444;
    }

    .notification-item__content {
      flex: 1;
      min-width: 0;
    }

    .notification-item__message {
      font-size: 13px;
      color: var(--text-primary);
      margin: 0 0 4px;
      line-height: 1.4;
    }

    .notification-item__time {
      font-size: 11px;
      color: var(--text-muted);
    }
  `],
})
export class NotificationBellComponent {
  notificationsService = inject(NotificationsService);
  open = signal(false);

  toggleDropdown(): void {
    this.open.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('app-notification-bell')) {
      this.open.set(false);
    }
  }
}
