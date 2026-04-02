import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'light' | 'dark'>('light');

  initTheme(): void {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) {
      this.applyTheme(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  toggleTheme(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.applyTheme(next);
    localStorage.setItem('theme', next);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    this.theme.set(theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
