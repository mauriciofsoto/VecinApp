import { User } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RegistroAdministradorRequest {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  nombreEdificio: string;
  direccion: string;
  localidad: string;
  provincia: string;
}

export interface MessageResponse {
  message: string;
}

export interface UnidadRegistroComunitarioRequest {
  piso: string | null;
  identificacion: string | null;
  estaAlquilada: boolean | null;
  esPrincipal?: boolean;
  tipo: 'Titularidad' | 'Residencia' | 'Ocupacion';
  personaRelacionNombre?: string | null;
  personaRelacionApellido?: string | null;
  pisoRelacion?: string | null;
  identificacionRelacion?: string | null;
}

export interface RegistroComunitarioRequest {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  tokenAcceso: string;
  perfil: 'Propietario' | 'Inquilino' | 'Personal';
  viveEnEdificio?: boolean | null;
  tieneOtrasUnidades?: boolean | null;
  declaraUnidadesAlquiladas?: boolean | null;
  modalidadAlquiler?: 'Directo' | 'InmobiliariaAdministracion' | null;
  propietarioDeclaradoViveEnEdificio?: boolean | null;
  propietarioDeclaradoNombre?: string | null;
  propietarioDeclaradoApellido?: string | null;
  propietarioDeclaradoPiso?: string | null;
  propietarioDeclaradoUnidad?: string | null;
  funcionPersonal?: string | null;
  funcionPersonalOtra?: string | null;
  horarioPersonal?: string | null;
  unidades: UnidadRegistroComunitarioRequest[];
}
