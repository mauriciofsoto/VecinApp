import { Component, effect, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Notification } from '../../../../../core/models/notification';
import { NotificationService } from '../../../../../core/services/notification';
import { NotificationListComponent } from '../notification-list/notification-list';
import { AuthService } from '../../../../../core/services/auth';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [NotificationListComponent],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBellComponent {
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isOpen = signal(false);
  readonly items = signal<Notification[]>([]);
  readonly unreadCount = signal(0);
  readonly error = signal(false);

  constructor() {
    effect(() => {
      const session = this.auth.captureSession();
      this.items.set([]);
      this.unreadCount.set(0);
      this.isOpen.set(false);
      this.error.set(false);
      if (session.userId) this.refresh();
    });
  }

  toggle(): void {
    this.isOpen.update(open => !open);
    if (this.isOpen()) this.refresh();
  }

  refresh(): void {
    const session = this.auth.captureSession();
    if (!session.userId) return;
    this.notifications.list().subscribe({
      next: items => {
        if (!this.auth.isCurrentSession(session)) return;
        this.items.set(items);
      },
      error: () => { if (this.auth.isCurrentSession(session)) this.error.set(true); },
    });
    this.notifications.unreadCount().subscribe({
      next: count => { if (this.auth.isCurrentSession(session)) this.unreadCount.set(count); },
      error: () => { if (this.auth.isCurrentSession(session)) this.error.set(true); },
    });
  }

  markAllRead(): void {
    if (!this.unreadCount()) return;
    const session = this.auth.captureSession();
    this.notifications.markAllRead().subscribe(() => {
      if (this.auth.isCurrentSession(session)) this.refresh();
    });
  }

  async select(item: Notification): Promise<void> {
    const session = this.auth.captureSession();
    if (!item.leida) {
      await new Promise<void>((resolve, reject) =>
        this.notifications.markRead(item.idNotificacion).subscribe({
          next: () => resolve(),
          error: reject,
        }),
      );
      if (!this.auth.isCurrentSession(session)) return;
      this.refresh();
    }
    if (!this.auth.isCurrentSession(session)) return;
    this.isOpen.set(false);
    if (item.ruta) await this.router.navigateByUrl(item.ruta);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.isOpen.set(false);
  }
}
