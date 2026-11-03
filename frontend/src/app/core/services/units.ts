import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Unit } from '../models/unit';

@Injectable({
  providedIn: 'root',
})
export class UnitsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/usuarios`;

  getMyUnits(): Observable<Unit[]> {
    return this.http.get<Unit[]>(`${this.apiUrl}/me/unidades`);
  }
  
}