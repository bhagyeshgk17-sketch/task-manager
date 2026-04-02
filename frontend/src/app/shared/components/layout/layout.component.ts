import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="layout">
      <app-navbar />
      <main class="layout__content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--bg-primary);
    }

    .layout__content {
      flex: 1;
      padding: 32px 24px;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
  `],
})
export class LayoutComponent {}
