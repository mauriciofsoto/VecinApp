// Punto de compatibilidad: la implementación única vive en './auth'.
// Se mantiene este archivo para no romper importaciones existentes.
export { AuthService } from './auth';
export type {
  ForgotPasswordRequest,
  MessageResponse,
  RegistroRequest,
  ResetPasswordRequest,
} from './auth';
