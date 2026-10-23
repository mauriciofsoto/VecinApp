export type EstadoInquilino = 'activo' | 'inactivo';

export interface Inquilino {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  edificioId: number;
  edificioNombre: string;
  unidad: string;
  estado: EstadoInquilino;
  fechaRegistro: string;
}