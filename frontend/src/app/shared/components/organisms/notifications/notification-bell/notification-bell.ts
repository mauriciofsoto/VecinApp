import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Notification } from '../../../../../core/models/notification';
import { NotificationService } from '../../../../../core/services/notification';
import { NotificationListComponent } from '../notification-list/notification-list';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [NotificationListComponent],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBellComponent implements OnInit {
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  readonly isOpen = signal(false);
  readonly items = signal<Notification[]>([]);
  readonly unreadCount = signal(0);

  ngOnInit(): void {
    this.refresh();
  }

  toggle(): void {
    this.isOpen.update(open => !open);
    if (this.isOpen()) this.refresh();
  }

  refresh(): void {
    this.notifications.list().subscribe({
      next: items => {
        this.items.set(items);
      },
    });
    this.notifications.unreadCount().subscribe({
      next: count => this.unreadCount.set(count),
    });
  }

  markAllRead(): void {
    if (!this.unreadCount()) return;
    this.notifications.markAllRead().subscribe(() => this.refresh());
  }

  async select(item: Notification): Promise<void> {
    if (!item.leida) {
      await new Promise<void>((resolve, reject) =>
        this.notifications.markRead(item.idNotificacion).subscribe({
          next: () => resolve(),
          error: reject,
        }),
      );
      this.refresh();
    }
    this.isOpen.set(false);
    if (item.ruta) await this.router.navigateByUrl(item.ruta);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.isOpen.set(false);
  }
}
