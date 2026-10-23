export type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada';

export interface Reserva {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  edificioId: number;
  titulo: string;
  lugar: string;
  descripcion: string;
  fecha: string;
  estado: EstadoReserva;
  fechaCreacion: string;
}