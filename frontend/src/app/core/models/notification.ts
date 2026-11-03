export interface Notification {
  idNotificacion: number;
  idUsuario: string;
  tipo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}