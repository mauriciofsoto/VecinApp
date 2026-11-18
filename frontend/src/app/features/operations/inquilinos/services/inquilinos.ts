
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UsuarioComunidad } from '../models/usuario-comunidad';

@Injectable({ providedIn: 'root' })
export class Inquilinos {
  private readonly apiUrl = `${environment.apiUrl}/api/usuarios/comunidad`;

  constructor(private readonly http: HttpClient) { }
  cambiarConfirmacion(id: number, estado: 'Verificada' | 'Rechazada'): Observable<any> {
    return this.http.put(
      `${environment.apiUrl}/api/usuarios/declaraciones/${id}/confirmacion`,
      { estado }
    );
  }
  obtenerComunidad(): Observable<UsuarioComunidad[]> {
    return this.http.get<UsuarioComunidad[]>(this.apiUrl);
  }
}
