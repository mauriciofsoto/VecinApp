export interface Incidencia {
  idIncidencia: number;
  titulo: string;
  descripcion: string;
  prioridad: string;
  fechaCreacion: string;
  estado: string;
  categoria: string;
  reportante: string;
  responsable: string | null;
}

export interface CrearIncidenciaRequest {
  idCategoriaIncidencia: number;
  titulo: string;
  descripcion: string;
  prioridad: 'Baja' | 'Media' | 'Alta';
}

export interface CambiarEstadoIncidenciaRequest {
  idEstadoIncidencia: number;
}

export interface CategoriaIncidencia {
  idCategoriaIncidencia: number;
  nombre: string;
}

export interface EstadoIncidencia {
  idEstadoIncidencia: number;
  nombre: string;
}
