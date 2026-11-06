
import { Injectable, computed, signal } from '@angular/core';

import {
  EstadoReserva,
  EstadoPropuesta,
  Reserva,
  EspacioComun,
  MensajeReserva,
  InteraccionReserva,
  PropuestaCambio,
  RolEmisorReserva,
} from '../models/reserva';

import {
  ESPACIOS_MOCK,
  RESERVAS_MOCK,
  MENSAJES_RESERVA_MOCK,
  INTERACCIONES_RESERVA_MOCK,
} from '../mocks/reservas.mock';

export type CrearReserva = Omit<
  Reserva,
  'id' | 'estado' | 'fechaCreacion'
>;

export type CrearMensajeReserva = Omit<
  MensajeReserva,
  'id' | 'fechaEnvio'
>;

export type CrearPropuestaCambio = Omit<
  PropuestaCambio,
  'id' | 'estado' | 'fechaCreacion' | 'respondidaEn'
>;

@Injectable({ providedIn: 'root' })
export class Reservas {
  private readonly estado = signal<Reserva[]>(RESERVAS_MOCK);
  private readonly espaciosEstado = signal<EspacioComun[]>(ESPACIOS_MOCK);
  private readonly mensajesEstado = signal<MensajeReserva[]>(
    MENSAJES_RESERVA_MOCK,
  );
  private readonly interaccionesEstado = signal<InteraccionReserva[]>(
    INTERACCIONES_RESERVA_MOCK,
  );
  private readonly propuestasEstado = signal<PropuestaCambio[]>([]);

  readonly reservas = this.estado.asReadonly();
  readonly espacios = this.espaciosEstado.asReadonly();
  readonly mensajes = this.mensajesEstado.asReadonly();
  readonly interacciones = this.interaccionesEstado.asReadonly();
  readonly propuestas = this.propuestasEstado.asReadonly();

  readonly pendientes = computed(() =>
    this.estado().filter(r => r.estado === 'pendiente'),
  );

  readonly confirmadas = computed(() =>
    this.estado().filter(r => r.estado === 'confirmada'),
  );

  readonly espaciosActivos = computed(() =>
    this.espaciosEstado().filter(e => e.activo),
  );

  readonly totalReservas = computed(() => this.estado().length);

  crear(datos: CrearReserva): void {
    const validacion = this.validarDisponibilidad(
      datos.espacioId,
      datos.fecha,
      datos.horaInicio,
      datos.horaFin,
      datos.cantidadParticipantes,
    );

    if (validacion) {
      throw new Error(validacion);
    }

    const reserva: Reserva = {
      ...datos,
      id: Date.now(),
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString(),
    };

    this.estado.update(lista => [reserva, ...lista]);

    this.registrarInteraccion(
      reserva.id,
      'solicitud-creada',
      reserva.usuarioId,
      reserva.usuarioNombre,
      'Se creó una nueva solicitud de reserva.',
    );
  }

  cambiarEstado(id: number, estado: EstadoReserva): void {
    const reserva = this.estado().find(r => r.id === id);

    if (!reserva) return;

    this.estado.update(lista =>
      lista.map(r => r.id === id ? { ...r, estado } : r),
    );

    const acciones: Partial<Record<EstadoReserva, {
      tipo: InteraccionReserva['tipo'];
      descripcion: string;
    }>> = {
      confirmada: {
        tipo: 'reserva-confirmada',
        descripcion: 'La reserva fue confirmada.',
      },
      rechazada: {
        tipo: 'reserva-rechazada',
        descripcion: 'La reserva fue rechazada.',
      },
      cancelada: {
        tipo: 'reserva-cancelada',
        descripcion: 'La reserva fue cancelada.',
      },
      finalizada: {
        tipo: 'reserva-finalizada',
        descripcion: 'La reserva fue finalizada.',
      },
    };

    const accion = acciones[estado];

    if (accion) {
      this.registrarInteraccion(
        id,
        accion.tipo,
        reserva.usuarioId,
        reserva.usuarioNombre,
        accion.descripcion,
      );
    }
  }

  reservasDeUsuario(usuarioId: string): Reserva[] {
    return this.estado()
      .filter(r => r.usuarioId === usuarioId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  reservasDeEspacio(espacioId: number): Reserva[] {
    return this.estado().filter(r =>
      r.espacioId === espacioId &&
      ['pendiente', 'en-mediacion', 'confirmada'].includes(r.estado),
    );
  }

  mensajesDe(reservaId: number): MensajeReserva[] {
    return this.mensajesEstado()
      .filter(m => m.reservaId === reservaId)
      .sort((a, b) => a.fechaEnvio.localeCompare(b.fechaEnvio));
  }

  enviarMensaje(datos: CrearMensajeReserva): void {
    const mensaje: MensajeReserva = {
      ...datos,
      id: Date.now(),
      fechaEnvio: new Date().toISOString(),
    };

    this.mensajesEstado.update(lista => [...lista, mensaje]);
  }

  interaccionesDe(reservaId: number): InteraccionReserva[] {
    return this.interaccionesEstado()
      .filter(i => i.reservaId === reservaId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  registrarInteraccion(
    reservaId: number,
    tipo: InteraccionReserva['tipo'],
    usuarioId: string,
    usuarioNombre: string,
    descripcion: string,
  ): void {
    const interaccion: InteraccionReserva = {
      id: Date.now(),
      reservaId,
      tipo,
      usuarioId,
      usuarioNombre,
      descripcion,
      fecha: new Date().toISOString(),
    };

    this.interaccionesEstado.update(lista => [
      ...lista,
      interaccion,
    ]);
  }

  proponerCambio(datos: CrearPropuestaCambio): void {
    const reserva = this.estado().find(r => r.id === datos.reservaId);

    if (!reserva) {
      throw new Error('No se encontró la reserva.');
    }

    if (reserva.estado !== 'pendiente' && reserva.estado !== 'confirmada') {
      throw new Error('Esta reserva no admite modificaciones.');
    }

    const validacion = this.validarDisponibilidad(
      reserva.espacioId,
      reserva.fecha,
      datos.horaInicioPropuesta,
      datos.horaFinPropuesta,
      reserva.cantidadParticipantes,
      reserva.id,
    );

    if (validacion) {
      throw new Error(validacion);
    }

    const propuesta: PropuestaCambio = {
      ...datos,
      id: Date.now(),
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString(),
      respondidaEn: null,
    };

    this.propuestasEstado.update(lista => [...lista, propuesta]);

    this.estado.update(lista =>
      lista.map(r =>
        r.id === reserva.id ? { ...r, estado: 'en-mediacion' } : r,
      ),
    );

    this.registrarInteraccion(
      reserva.id,
      'cambio-propuesto',
      reserva.usuarioId,
      reserva.usuarioNombre,
      'Se propuso un cambio de horario.',
    );
  }

  responderPropuesta(
    propuestaId: number,
    estado: Extract<EstadoPropuesta, 'aceptada' | 'rechazada'>,
  ): void {
    const propuesta = this.propuestasEstado().find(p => p.id === propuestaId);

    if (!propuesta || propuesta.estado !== 'pendiente') return;

    this.propuestasEstado.update(lista =>
      lista.map(p =>
        p.id === propuestaId
          ? { ...p, estado, respondidaEn: new Date().toISOString() }
          : p,
      ),
    );

    const reserva = this.estado().find(r => r.id === propuesta.reservaId);

    if (!reserva) return;

    if (estado === 'aceptada') {
      this.estado.update(lista =>
        lista.map(r =>
          r.id === reserva.id
            ? {
                ...r,
                horaInicio: propuesta.horaInicioPropuesta,
                horaFin: propuesta.horaFinPropuesta,
                estado: 'pendiente',
              }
            : r,
        ),
      );

      this.registrarInteraccion(
        reserva.id,
        'cambio-aceptado',
        reserva.usuarioId,
        reserva.usuarioNombre,
        'Se aceptó la propuesta de cambio de horario.',
      );
    } else {
      this.estado.update(lista =>
        lista.map(r =>
          r.id === reserva.id
            ? {
                ...r,
                estado: 'pendiente',
              }
            : r,
        ),
      );

      this.registrarInteraccion(
        reserva.id,
        'cambio-rechazado',
        reserva.usuarioId,
        reserva.usuarioNombre,
        'Se rechazó la propuesta de cambio de horario.',
      );
    }
  }

  private validarDisponibilidad(
    espacioId: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    participantes: number,
    excluirReservaId?: number,
  ): string | null {
    const espacio = this.espaciosEstado().find(e => e.id === espacioId);

    if (!espacio || !espacio.activo) {
      return 'El espacio seleccionado no está disponible.';
    }

    if (horaInicio >= horaFin) {
      return 'La hora de inicio debe ser anterior a la hora de finalización.';
    }

    if (
      horaInicio < espacio.horaApertura ||
      horaFin > espacio.horaCierre
    ) {
      return 'El horario está fuera del horario habilitado.';
    }

    if (participantes < 1 || participantes > espacio.capacidadMaxima) {
      return `La capacidad máxima del espacio es de ${espacio.capacidadMaxima} personas.`;
    }

    const superposicion = this.estado().some(r =>
      r.id !== excluirReservaId &&
      r.espacioId === espacioId &&
      r.fecha === fecha &&
      ['pendiente', 'en-mediacion', 'confirmada'].includes(r.estado) &&
      horaInicio < r.horaFin &&
      horaFin > r.horaInicio,
    );

    if (superposicion) {
      return 'El espacio ya tiene una reserva en ese horario.';
    }

    return null;
  }
}
