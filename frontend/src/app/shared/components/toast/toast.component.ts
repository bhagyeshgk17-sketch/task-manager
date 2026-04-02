import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast" [class]="'toast--' + type" role="alert">
      <span class="toast__icon">{{ icon }}</span>
      <span class="toast__message">{{ message }}</span>
      <button class="toast__close" (click)="closed.emit()" aria-label="Dismiss">&#x2715;</button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 280px;
      max-width: 380px;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      font-family: inherit;
      animation: slide-in 0.25s ease-out;
    }

    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .toast--success {
      background: var(--toast-success-bg);
      border-left: 4px solid var(--success);
      color: var(--toast-success-color);
    }

    .toast--error {
      background: var(--toast-error-bg);
      border-left: 4px solid var(--danger);
      color: var(--toast-error-color);
    }

    .toast--info {
      background: var(--toast-info-bg);
      border-left: 4px solid var(--accent-color);
      color: var(--toast-info-color);
    }

    .toast__icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .toast__message {
      flex: 1;
      line-height: 1.4;
    }

    .toast__close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.6;
      padding: 0;
      color: inherit;
      flex-shrink: 0;
      line-height: 1;
    }

    .toast__close:hover {
      opacity: 1;
    }
  `],
})
export class ToastComponent {
  @Input() message = '';
  @Input() type: ToastType = 'info';
  @Output() closed = new EventEmitter<void>();

  get icon(): string {
    return { success: '✓', error: '✕', info: 'ℹ' }[this.type];
  }
}
