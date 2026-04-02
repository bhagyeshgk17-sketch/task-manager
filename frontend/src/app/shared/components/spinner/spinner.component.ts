import { Component, Input } from '@angular/core';

type SpinnerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-spinner',
  template: `
    <div class="spinner-wrapper">
      <div class="spinner" [class]="'spinner--' + size" role="status" aria-label="Loading"></div>
    </div>
  `,
  styles: [`
    .spinner-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      padding: 16px;
    }

    .spinner {
      border-radius: 50%;
      border-style: solid;
      border-color: var(--border-color);
      border-top-color: var(--accent-color);
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinner--sm {
      width: 20px;
      height: 20px;
      border-width: 2px;
    }

    .spinner--md {
      width: 36px;
      height: 36px;
      border-width: 3px;
    }

    .spinner--lg {
      width: 56px;
      height: 56px;
      border-width: 4px;
    }
  `],
})
export class SpinnerComponent {
  @Input() size: SpinnerSize = 'md';
}
