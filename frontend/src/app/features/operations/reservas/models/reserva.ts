
export type EstadoReserva =
  | 'pendiente'
  | 'en-mediacion'
  | 'confirmada'
  | 'rechazada'
  | 'cancelada'
  | 'finalizada';

export type TipoEvento = 'publico' | 'privado';

export type CategoriaEvento =
  | 'reunion-consorcio'
  | 'asamblea'
  | 'actividad-comunitaria'
  | 'celebracion'
  | 'otro';

export type EstadoPropuesta =
  | 'pendiente'
  | 'aceptada'
  | 'rechazada';

export type RolEmisorReserva = 'residente' | 'administracion';

export type TipoInteraccion =
  | 'solicitud-creada'
  | 'reserva-confirmada'
  | 'reserva-rechazada'
  | 'cambio-propuesto'
  | 'cambio-aceptado'
  | 'cambio-rechazado'
  | 'reserva-cancelada'
  | 'reserva-finalizada'
  | 'evento-publicado';

export interface EspacioComun {
  id: number;
  edificioId: number;
  nombre: string;
  descripcion: string;
  horaApertura: string;
  horaCierre: string;
  capacidadMaxima: number;
  activo: boolean;
}

export interface Reserva {
  id: number;
  usuarioId: string;
  usuarioNombre: string;
  unidadId: number;
  unidadNombre: string;
  edificioId: number;
  espacioId: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cantidadParticipantes: number;
  estado: EstadoReserva;
  tipoEvento: TipoEvento | null;
  categoriaEvento: CategoriaEvento | null;
  fechaCreacion: string;
  creadaPorAdministracion: boolean;
}

export interface PropuestaCambio {
  id: number;
  reservaId: number;
  propuestoPor: RolEmisorReserva;
  horaInicioOriginal: string;
  horaFinOriginal: string;
  horaInicioPropuesta: string;
  horaFinPropuesta: string;
  estado: EstadoPropuesta;
  fechaCreacion: string;
  respondidaEn: string | null;
}

export interface MensajeReserva {
  id: number;
  reservaId: number;
  emisorId: string;
  emisorNombre: string;
  rolEmisor: RolEmisorReserva;
  contenido: string;
  fechaEnvio: string;
}

export interface InteraccionReserva {
  id: number;
  reservaId: number;
  tipo: TipoInteraccion;
  usuarioId: string;
  usuarioNombre: string;
  descripcion: string;
  fecha: string;
}

export interface InvitacionEvento {
  id: number;
  reservaId: number;
  usuarioId: string;
  estado: 'pendiente' | 'asistire' | 'no-asistire';
  fechaRespuesta: string | null;
}
