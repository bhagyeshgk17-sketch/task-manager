import { Component, inject, OnInit, Injector, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { NotificationsService } from './core/services/notifications.service';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <router-outlet />
    <app-toast-container />
  `,
})
export class App implements OnInit {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private notificationsService = inject(NotificationsService);
  private injector = inject(Injector);

  ngOnInit(): void {
    this.authService.loadUserFromStorage();
    this.themeService.initTheme();

    // Step 4 — reactive effect so connect/disconnect fires whenever
    // isLoggedIn changes (login, logout, page refresh after token load)
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.notificationsService.connect();
      } else {
        this.notificationsService.disconnect();
      }
    }, { injector: this.injector });
  }
}
