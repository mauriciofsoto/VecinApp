export interface Notification {
  idNotificacion: number;
  titulo: string;
  tipo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  ruta?: string | null;
}
