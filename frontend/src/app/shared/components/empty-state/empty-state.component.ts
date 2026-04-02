import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">&#x1F4C2;</div>
      <h3 class="empty-state__title">{{ title }}</h3>
      <p class="empty-state__message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
      gap: 12px;
    }

    .empty-state__icon {
      font-size: 48px;
      line-height: 1;
      margin-bottom: 4px;
    }

    .empty-state__title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .empty-state__message {
      margin: 0;
      font-size: 14px;
      color: var(--text-muted);
      max-width: 320px;
      line-height: 1.5;
    }
  `],
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() message = '';
}
