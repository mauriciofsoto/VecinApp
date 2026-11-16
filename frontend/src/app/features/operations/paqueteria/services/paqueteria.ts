import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Paquete, CrearPaquete } from '../models/paquete';
import { DestinatarioPaquete } from '../models/destinatario-paquete';
import { MensajePaquete, CrearMensajePaquete } from '../models/mensaje-paquete';

@Injectable({ providedIn: 'root' })
export class Paqueteria {
  private readonly apiUrl = `${environment.apiUrl}/api/paqueteria`;
  private readonly estadoPaquetes = signal<Paquete[]>([]);
  private readonly estadoMensajes = signal<MensajePaquete[]>([]);

  constructor(private readonly http: HttpClient) {}

  readonly paquetes = this.estadoPaquetes.asReadonly();
  readonly mensajes = this.estadoMensajes.asReadonly();
  readonly pendientes = computed(() => this.estadoPaquetes().filter(p => p.estado === 'Pendiente'));
  readonly entregados = computed(() => this.estadoPaquetes().filter(p => p.estado === 'Entregado'));
  readonly confirmados = computed(() => this.estadoPaquetes().filter(p => p.estado === 'Confirmado'));

  obtenerDestinatarios(): Observable<DestinatarioPaquete[]> {
    return this.http.get<DestinatarioPaquete[]>(`${this.apiUrl}/destinatarios`);
  }

  listar(): Observable<Paquete[]> {
    return this.http.get<Paquete[]>(this.apiUrl).pipe(tap(paquetes => this.estadoPaquetes.set(paquetes)));
  }

  misPaquetes(): Observable<Paquete[]> {
    return this.http.get<Paquete[]>(`${this.apiUrl}/mis-paquetes`).pipe(tap(paquetes => this.estadoPaquetes.set(paquetes)));
  }

  registrar(datos: CrearPaquete): Observable<Paquete> {
    return this.http.post<Paquete>(this.apiUrl, datos).pipe(
      tap(paquete => this.estadoPaquetes.update(paquetes => [paquete, ...paquetes.filter(p => p.id !== paquete.id)])),
    );
  }

  registrarEntrega(paqueteId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${paqueteId}/entrega`, null);
  }

  confirmarRecepcion(paqueteId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${paqueteId}/confirmacion`, null);
  }

  obtenerMensajes(paqueteId: number): Observable<MensajePaquete[]> {
    return this.http.get<Omit<MensajePaquete, 'paqueteId' | 'propio'>[]>(`${this.apiUrl}/${paqueteId}/mensajes`).pipe(
      tap(mensajes => this.estadoMensajes.update(actuales => [
        ...actuales.filter(mensaje => mensaje.paqueteId !== paqueteId),
        ...mensajes.map(mensaje => ({ ...mensaje, paqueteId })),
      ])),
      map(mensajes => mensajes.map(mensaje => ({ ...mensaje, paqueteId }))),
    );
  }

  mensajesDe(paqueteId: number): MensajePaquete[] {
    return this.estadoMensajes().filter(mensaje => mensaje.paqueteId === paqueteId);
  }

  enviarMensaje(paqueteId: number, datos: CrearMensajePaquete): Observable<MensajePaquete> {
    return this.http.post<Omit<MensajePaquete, 'paqueteId' | 'propio'>>(`${this.apiUrl}/${paqueteId}/mensajes`, datos).pipe(
      map(mensaje => ({ ...mensaje, paqueteId, propio: true })),
      tap(mensaje => this.estadoMensajes.update(actuales => [...actuales, mensaje])),
    );
  }
}
