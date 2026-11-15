import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Inquilino } from '../models/inquilino';
import { UsuarioComunidad } from '../models/usuario-comunidad';

export type CrearInquilino = Omit<
  Inquilino,
  'id' | 'estado' | 'fechaRegistro'
>;

@Injectable({ providedIn: 'root' })
export class Inquilinos {
  private readonly apiUrl = `${environment.apiUrl}/api/usuarios/comunidad`;
  private readonly estado = signal<Inquilino[]>([]);

  constructor(private readonly http: HttpClient) {}

  readonly inquilinos = this.estado.asReadonly();

  readonly totalInquilinos = computed(() => this.estado().length);

  obtenerComunidad(): Observable<UsuarioComunidad[]> {
    return this.http.get<UsuarioComunidad[]>(this.apiUrl);
  }

  registrar(datos: CrearInquilino): boolean {
    const email = datos.email.trim().toLowerCase();
    const documento = datos.documento.trim();

    const duplicado = this.estado().some(
      item =>
        item.email.toLowerCase() === email ||
        item.documento === documento,
    );

    if (duplicado) {
      return false;
    }

    const inquilino: Inquilino = {
      ...datos,
      id: Date.now(),
      email,
      documento,
      estado: 'activo',
      fechaRegistro: new Date().toISOString(),
    };

    this.estado.update(lista => [inquilino, ...lista]);

    return true;
  }

  cambiarEstado(id: number): void {
    this.estado.update(lista =>
      lista.map(inquilino =>
        inquilino.id === id
          ? {
              ...inquilino,
              estado: inquilino.estado === 'activo' ? 'inactivo' : 'activo',
            }
          : inquilino,
      ),
    );
  }

  porEdificio(edificioId: number): Inquilino[] {
    return this.estado().filter(
      inquilino => inquilino.edificioId === edificioId,
    );
  }
}
