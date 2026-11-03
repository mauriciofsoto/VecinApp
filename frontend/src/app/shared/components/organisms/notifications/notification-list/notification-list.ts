import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Notification } from '../../../../../core/models/notification';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.scss',
})
export class NotificationListComponent {
  readonly items = input<Notification[]>([]);
  readonly selected = output<Notification>();
  readonly markAll = output<void>();
  get hasUnread(): boolean {
    return this.items().some(item => !item.leida);
  }
}
