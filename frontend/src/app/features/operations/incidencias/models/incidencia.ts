
export type EstadoIncidencia =
  | 'pendiente'
  | 'en-proceso'
  | 'resuelta'
  | 'rechazada';

export type PrioridadIncidencia =
  | 'baja'
  | 'media'
  | 'alta';

export interface Incidencia {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  estado: EstadoIncidencia;
  prioridad: PrioridadIncidencia;
  fechaCreacion: string;
  usuarioId: number;
  usuarioNombre: string;
}
