import { Injectable, computed, signal } from '@angular/core';
import { Paquete, CrearPaquete } from '../models/paquete';
import {
  MensajePaquete,
  CrearMensajePaquete,
} from '../models/mensaje-paquete';

@Injectable({
  providedIn: 'root',
})
export class Paqueteria {
  private readonly estadoPaquetes = signal<Paquete[]>([
    {
      id: 1,
      destinatarioId: 1,
      destinatarioNombre: 'Residente de prueba',
      edificioId: 1,
      edificioNombre: 'Edificio A',
      unidad: '1A',
      descripcion: 'Caja mediana',
      remitente: 'Correo',
      fechaRecepcion: new Date().toISOString(),
      estado: 'pendiente',
    },
  ]);

  private readonly estadoMensajes = signal<MensajePaquete[]>([
    {
      id: 1,
      paqueteId: 1,
      emisorId: 0,
      emisorNombre: 'Encargado',
      rolEmisor: 'encargado',
      contenido: 'Hola, recibimos un paquete a tu nombre. Podés pasar a retirarlo.',
      fechaEnvio: new Date().toISOString(),
    },
  ]);

  readonly paquetes = this.estadoPaquetes.asReadonly();
  readonly mensajes = this.estadoMensajes.asReadonly();

  readonly pendientes = computed(() =>
    this.estadoPaquetes().filter(
      paquete => paquete.estado === 'pendiente',
    ),
  );

  readonly entregados = computed(() =>
    this.estadoPaquetes().filter(
      paquete => paquete.estado === 'entregado',
    ),
  );

  registrar(datos: CrearPaquete): Paquete {
    const paquete: Paquete = {
      ...datos,
      id: Date.now(),
      fechaRecepcion: new Date().toISOString(),
      estado: 'pendiente',
    };

    this.estadoPaquetes.update(lista => [paquete, ...lista]);

    return paquete;
  }

  paquetesDeResidente(residenteId: number): Paquete[] {
    return this.estadoPaquetes().filter(
      paquete => paquete.destinatarioId === residenteId,
    );
  }

  mensajesDe(paqueteId: number): MensajePaquete[] {
    return this.estadoMensajes()
      .filter(mensaje => mensaje.paqueteId === paqueteId)
      .sort(
        (a, b) =>
          new Date(a.fechaEnvio).getTime() -
          new Date(b.fechaEnvio).getTime(),
      );
  }

  enviarMensaje(datos: CrearMensajePaquete): void {
    const paqueteExiste = this.estadoPaquetes().some(
      paquete => paquete.id === datos.paqueteId,
    );

    if (!paqueteExiste || !datos.contenido.trim()) {
      return;
    }

    const mensaje: MensajePaquete = {
      ...datos,
      id: Date.now(),
      contenido: datos.contenido.trim(),
      fechaEnvio: new Date().toISOString(),
    };

    this.estadoMensajes.update(lista => [...lista, mensaje]);
  }

  confirmarRecepcion(
    paqueteId: number,
    residenteId: number,
  ): boolean {
    const paquete = this.estadoPaquetes().find(
      item => item.id === paqueteId,
    );

    if (
      !paquete ||
      paquete.destinatarioId !== residenteId ||
      paquete.estado !== 'pendiente'
    ) {
      return false;
    }

    this.estadoPaquetes.update(lista =>
      lista.map(item =>
        item.id === paqueteId
          ? {
              ...item,
              estado: 'entregado',
              fechaEntrega: new Date().toISOString(),
            }
          : item,
      ),
    );

    return true;
  }
}