import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Paquete, CrearPaquete } from '../models/paquete';
import { DestinatarioPaquete, UnidadDestinatarioPaquete } from '../models/destinatario-paquete';
import { MensajePaquete, CrearMensajePaquete } from '../models/mensaje-paquete';
import { AuthService } from '../../../../core/services/auth';

@Injectable({ providedIn: 'root' })
export class Paqueteria {
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/api/paqueteria`;
  private readonly estadoPaquetes = signal<Paquete[]>([]);
  private readonly estadoMensajes = signal<MensajePaquete[]>([]);
  private readonly ownerSession = signal<{ userId: string | null; version: number } | null>(null);

  constructor(private readonly http: HttpClient) {
    effect(() => {
      this.auth.currentUser();
      this.auth.sessionVersion();
      this.estadoPaquetes.set([]);
      this.estadoMensajes.set([]);
      this.ownerSession.set(null);
    });
  }

  private readonly isOwnerCurrentSession = computed(() => {
    const owner = this.ownerSession();
    return owner !== null
      && owner.userId !== null
      && owner.userId === this.auth.currentUser()?.id
      && owner.version === this.auth.sessionVersion();
  });
  readonly paquetes = computed(() => this.isOwnerCurrentSession() ? this.estadoPaquetes() : []);
  readonly mensajes = computed(() => this.isOwnerCurrentSession() ? this.estadoMensajes() : []);
  readonly pendientes = computed(() => this.paquetes().filter(p => p.estado === 'Pendiente'));
  readonly entregados = computed(() => this.paquetes().filter(p => p.estado === 'Entregado'));
  readonly confirmados = computed(() => this.paquetes().filter(p => p.estado === 'Confirmado'));

  obtenerDestinatarios(): Observable<DestinatarioPaquete[]> {
    return this.http.get<DestinatarioPaquete[]>(`${this.apiUrl}/destinatarios`);
  }

  obtenerUnidadesDestinatarios(): Observable<UnidadDestinatarioPaquete[]> {
    return this.http.get<UnidadDestinatarioPaquete[]>(`${this.apiUrl}/unidades-destinatarios`);
  }

  listar(): Observable<Paquete[]> {
    const session = this.auth.captureSession();
    return this.http.get<Paquete[]>(this.apiUrl).pipe(tap(paquetes => {
      if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this.estadoPaquetes.set(paquetes); }
    }));
  }

  misPaquetes(): Observable<Paquete[]> {
    const session = this.auth.captureSession();
    return this.http.get<Paquete[]>(`${this.apiUrl}/mis-paquetes`).pipe(tap(paquetes => {
      if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this.estadoPaquetes.set(paquetes); }
    }));
  }

  registrar(datos: CrearPaquete): Observable<Paquete> {
    const session = this.auth.captureSession();
    return this.http.post<Paquete>(this.apiUrl, datos).pipe(
      tap(paquete => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this.estadoPaquetes.update(paquetes => [paquete, ...paquetes.filter(p => p.id !== paquete.id)]); } }),
    );
  }

  registrarEntrega(paqueteId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${paqueteId}/entrega`, null);
  }

  confirmarRecepcion(paqueteId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${paqueteId}/confirmacion`, null);
  }

  obtenerMensajes(paqueteId: number): Observable<MensajePaquete[]> {
    const session = this.auth.captureSession();
    return this.http.get<Omit<MensajePaquete, 'paqueteId' | 'propio'>[]>(`${this.apiUrl}/${paqueteId}/mensajes`).pipe(
      tap(mensajes => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this.estadoMensajes.update(actuales => [
        ...actuales.filter(mensaje => mensaje.paqueteId !== paqueteId),
        ...mensajes.map(mensaje => ({ ...mensaje, paqueteId })),
      ]); } }),
      map(mensajes => mensajes.map(mensaje => ({ ...mensaje, paqueteId }))),
    );
  }

  mensajesDe(paqueteId: number): MensajePaquete[] {
    return this.mensajes().filter(mensaje => mensaje.paqueteId === paqueteId);
  }

  enviarMensaje(paqueteId: number, datos: CrearMensajePaquete): Observable<MensajePaquete> {
    const session = this.auth.captureSession();
    return this.http.post<Omit<MensajePaquete, 'paqueteId' | 'propio'>>(`${this.apiUrl}/${paqueteId}/mensajes`, datos).pipe(
      map(mensaje => ({ ...mensaje, paqueteId, propio: true })),
      tap(mensaje => { if (this.auth.isCurrentSession(session)) { this.ownerSession.set(session); this.estadoMensajes.update(actuales => [...actuales, mensaje]); } }),
    );
  }
}
