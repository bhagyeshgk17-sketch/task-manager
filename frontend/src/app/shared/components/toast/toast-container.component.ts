import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from './toast.component';

@Component({
  selector: 'app-toast-container',
  imports: [NgFor, ToastComponent],
  template: `
    <div class="toast-container">
      <app-toast
        *ngFor="let toast of toastService.toasts(); trackBy: trackById"
        [message]="toast.message"
        [type]="toast.type"
        (closed)="toastService.dismiss(toast.id)"
      />
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .toast-container > * {
      pointer-events: all;
    }
  `],
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  trackById(_: number, toast: { id: number }): number {
    return toast.id;
  }
}
