import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, NotificationBellComponent],
  template: `
    <nav class="navbar" [class.navbar--open]="menuOpen()">

      <div class="navbar__brand">
        <a routerLink="/dashboard" class="navbar__logo">&#x2713; TaskManager</a>
      </div>

      <!-- Hamburger (mobile only) -->
      <button
        class="navbar__hamburger"
        type="button"
        (click)="menuOpen.update(v => !v)"
        [attr.aria-expanded]="menuOpen()"
        aria-label="Toggle navigation"
      >
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>

      <ul class="navbar__links" [class.navbar__links--open]="menuOpen()">
        <li>
          <a routerLink="/dashboard" routerLinkActive="navbar__link--active"
             class="navbar__link" (click)="menuOpen.set(false)">
            Dashboard
          </a>
        </li>
        <li>
          <a routerLink="/tasks" routerLinkActive="navbar__link--active"
             class="navbar__link" (click)="menuOpen.set(false)">
            Tasks
          </a>
        </li>
        <li>
          <a routerLink="/profile" routerLinkActive="navbar__link--active"
             class="navbar__link" (click)="menuOpen.set(false)">
            Profile
          </a>
        </li>
        <!-- User + logout shown inline inside drawer on mobile -->
        <li class="navbar__mobile-user">
          <span class="navbar__username">{{ authService.currentUser()?.name }}</span>
          <button class="navbar__logout" (click)="logout()">Logout</button>
        </li>
      </ul>

      <!-- User + logout shown in top bar on desktop -->
      <div class="navbar__user">
        <span class="navbar__username">{{ authService.currentUser()?.name }}</span>
        <app-notification-bell />
        <button
          class="navbar__theme-toggle"
          type="button"
          (click)="themeService.toggleTheme()"
          [title]="themeService.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          [attr.aria-label]="themeService.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          {{ themeService.theme() === 'dark' ? '☀' : '🌙' }}
        </button>
        <button class="navbar__logout" (click)="logout()">Logout</button>
      </div>

    </nav>
  `,
  styles: [`
    /* ── Base (desktop) ── */
    .navbar {
      display: flex;
      align-items: center;
      height: 60px;
      padding: 0 24px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-color);
      gap: 24px;
      position: relative;
      z-index: 100;
    }

    .navbar__brand { flex-shrink: 0; }

    .navbar__logo {
      font-size: 18px;
      font-weight: 700;
      color: var(--accent-color);
      text-decoration: none;
      letter-spacing: -0.3px;
    }

    .navbar__links {
      display: flex;
      align-items: center;
      gap: 4px;
      list-style: none;
      margin: 0;
      padding: 0;
      flex: 1;
    }

    .navbar__link {
      display: block;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
    }

    .navbar__link:hover  { background: var(--bg-secondary); color: var(--text-primary); }
    .navbar__link--active { background: #eff6ff; color: #2563eb; }

    .navbar__user {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .navbar__username {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .navbar__theme-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      font-size: 16px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      flex-shrink: 0;
    }

    .navbar__theme-toggle:hover {
      background: var(--bg-secondary);
    }

    .navbar__logout {
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    .navbar__logout:hover {
      background: #fef2f2;
      color: #ef4444;
      border-color: #fca5a5;
    }

    /* Always hide the in-drawer user row on desktop */
    .navbar__mobile-user { display: none; }

    /* Hamburger hidden on desktop */
    .navbar__hamburger { display: none; }

    /* ── Mobile (< 768px) ── */
    @media (max-width: 767px) {

      .navbar {
        flex-wrap: wrap;
        height: auto;
        padding: 0 16px;
      }

      .navbar__brand {
        height: 56px;
        display: flex;
        align-items: center;
        flex: 1;
      }

      /* Hamburger button */
      .navbar__hamburger {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 5px;
        width: 40px;
        height: 40px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        flex-shrink: 0;
      }

      .navbar__hamburger:hover { background: var(--bg-secondary); }

      .bar {
        display: block;
        width: 22px;
        height: 2px;
        background: var(--text-secondary);
        border-radius: 2px;
        transition: transform 0.2s, opacity 0.2s;
      }

      /* Animate bars to X when open */
      .navbar--open .bar:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      .navbar--open .bar:nth-child(2) { opacity: 0; }
      .navbar--open .bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

      /* Nav drawer */
      .navbar__links {
        display: none;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        width: 100%;
        padding: 8px 0 12px;
        border-top: 1px solid var(--border-color);
      }

      .navbar__links--open { display: flex; }

      .navbar__link {
        padding: 12px 8px;
        border-radius: 6px;
        font-size: 15px;
      }

      /* Show user + logout inside drawer on mobile */
      .navbar__mobile-user {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 8px 4px;
        margin-top: 4px;
        border-top: 1px solid var(--border-color);
      }

      /* Hide the desktop top-bar user section */
      .navbar__user { display: none; }
    }
  `],
})
export class NavbarComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  menuOpen = signal(false);

  logout(): void {
    this.menuOpen.set(false);
    this.authService.logout().subscribe();
  }
}
