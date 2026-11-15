
export interface UnidadUsuarioEdificio {
  id: number;
  piso: string;
  identificacion: string;
  tipoRelacion: string;
}

export interface UsuarioEdificio {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  estado: 'Activo' | 'Desactivado';
  fechaRegistro: string;
  edificioId: number | null;
  edificioNombre: string;
  unidades: UnidadUsuarioEdificio[];
}
