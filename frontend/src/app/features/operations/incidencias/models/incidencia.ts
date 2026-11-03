export type PrioridadIncidencia = 'baja' | 'media' | 'alta';
export type EstadoIncidencia = string;

export interface Incidencia {
  id: number;
  idIncidencia: number;
  idEstadoIncidencia: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  categoriaId: number;
  idCategoriaIncidencia: number;
  ubicacion: string;
  estado: EstadoIncidencia;
  prioridad: string;
  fechaCreacion: string;
  usuarioId: string;
  usuarioNombre: string;
  responsableId: string | null;
  responsableNombre: string | null;
  responsable: string | null;
  reportante: string;
}

export interface DetalleIncidencia extends Incidencia {
  idCategoriaIncidencia: number;
}

export interface EstadoIncidenciaDto {
  idEstadoIncidencia: number;
  nombre: string;
}
