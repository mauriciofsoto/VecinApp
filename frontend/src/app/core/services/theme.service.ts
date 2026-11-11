import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'vecinapp_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly mode = signal<ThemeMode>(this.readInitialTheme());

  readonly theme = this.mode.asReadonly();
  readonly isLight = computed(() => this.mode() === 'light');
  readonly toggleLabel = computed(() =>
    this.isLight() ? 'Cambiar al tema oscuro' : 'Cambiar al tema claro',
  );

  constructor() {
    this.apply(this.mode());
  }

  toggle(): void {
    this.setTheme(this.mode() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: ThemeMode): void {
    this.mode.set(theme);
    this.apply(theme);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }

  private readInitialTheme(): ThemeMode {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'dark';
    } catch {
      return 'dark';
    }
  }

  private apply(theme: ThemeMode): void {
    this.document.documentElement.dataset['theme'] = theme;
  }
}
