import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/notificaciones`;

  list(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  unreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/no-leidas/count`);
  }

  markRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/leida`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/leidas`, {});
  }
}
