import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ApiHealth {
  status: string;
  database: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiHealthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  check() {
    return this.http.get<ApiHealth>(`${this.apiUrl}/Health`);
  }
}
