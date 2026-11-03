export type EstadoIncidencia = string;

export type PrioridadIncidencia = 'baja' | 'media' | 'alta';

export interface Incidencia {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  categoriaId: number;
  ubicacion: string;
  estado: EstadoIncidencia;
  prioridad: string;
  fechaCreacion: string;
  usuarioId: string;
  usuarioNombre: string;
  responsableId: string | null;
  responsableNombre: string | null;
}
