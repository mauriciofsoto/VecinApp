import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { UserDashboardComponent } from './user-dashboard.component';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

const user = (id: string) => ({ id, nombre: id, apellido: 'Vecino', email: `${id}@example.test`, rol: 'Inquilino', declaraUnidadesAlquiladas: false });

function setRemoteSession(id: string): void {
  localStorage.setItem('currentUser', JSON.stringify(user(id)));
  localStorage.setItem('accessToken', `token-${id}`);
  localStorage.setItem('refreshToken', `refresh-${id}`);
  localStorage.setItem('authSessionRevision', `${Date.now()}:remote`);
  window.dispatchEvent(new StorageEvent('storage', { key: 'authSessionRevision', storageArea: localStorage }));
}

function flushRequests(http: HttpTestingController, index: number, id: string): void {
  const response = (url: string, data: unknown): void => {
    const requests = http.match(url);
    expect(requests.length).toBe(index + 1);
    requests[index].flush(data as never);
  };
  response(`${environment.apiUrl}/publicaciones`, [{
    id: index + 1, authorRole: 'vecino', type: 'publicacion', userId: id, userName: id,
    title: `Post ${id}`, content: 'Contenido', createdAt: '2026-11-16T12:00:00Z',
    reactions: [{ emoji: '👍', count: 1, reacted: true }],
    comments: [{ id: index + 1, userName: id, content: `Comentario ${id}`, createdAt: '2026-11-16T12:00:00Z', isMine: true }],
    commentsCount: 1,
  }]);
  response(`${environment.apiUrl}/api/usuarios/me/unidades`, [{ id: index + 1, piso: '1', identificacion: 'A', edificioId: 1, edificioNombre: `Edificio ${id}`, tipoRelacion: 'Residencia' }]);
  response(`${environment.apiUrl}/api/incidencias/mis-incidencias`, [{
    idIncidencia: index + 1, idEstadoIncidencia: 1, idCategoriaIncidencia: 1,
    idUsuarioReportante: id, idUsuarioResponsable: null, titulo: `Incidencia ${id}`,
    descripcion: 'Detalle', ubicacion: null, prioridad: 'Media', fechaCreacion: '2026-11-16T12:00:00Z',
    estado: 'Pendiente', categoria: 'General', reportante: id, responsable: null,
    comentarioResolucion: null,
  }]);
  response(`${environment.apiUrl}/api/notificaciones`, [{ idNotificacion: index + 1, titulo: 'Aviso', tipo: 'Comunidad', mensaje: id, fecha: '2026-11-16T12:00:00Z', leida: false, ruta: null }]);
  response(`${environment.apiUrl}/api/reservas/mis-reservas`, [{
    id: index + 1, usuarioId: id, usuarioNombre: id, unidadId: 1, unidadNombre: '1 A', edificioId: 1,
    espacioId: 1, titulo: `Reserva ${id}`, descripcion: '', fecha: '2026-11-20', horaInicio: '10:00',
    horaFin: '11:00', cantidadParticipantes: 1, estado: 'pendiente', tipoEvento: 'privado',
    categoriaEvento: null, fechaCreacion: '2026-11-16T12:00:00Z', creadaPorAdministracion: false,
  }]);
  response(`${environment.apiUrl}/api/paqueteria/mis-paquetes`, [{
    id: index + 1, identificacion: `Paquete ${id}`, remitente: 'Correo', idUsuarioDestinatario: id,
    nombreDestinatario: id, apellidoDestinatario: 'Vecino', estado: 'Pendiente',
    fechaRecepcion: '2026-11-16T12:00:00Z', fechaEntrega: null, fechaConfirmacion: null, observaciones: null,
  }]);
}

describe('UserDashboardComponent', () => {
  let component: UserDashboardComponent;
  let fixture: ComponentFixture<UserDashboardComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('currentUser', JSON.stringify(user('user-a')));
    localStorage.setItem('accessToken', 'token-user-a');
    localStorage.setItem('refreshToken', 'refresh-user-a');
    await TestBed.configureTestingModule({
      imports: [UserDashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserDashboardComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should create', () => {
    flushRequests(http, 0, 'user-a');
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.units()?.[0].edificioNombre).toBe('Edificio user-a');
    expect(component.incidents()?.[0].usuarioId).toBe('user-a');
    expect(component.reservations()?.[0].usuarioId).toBe('user-a');
    expect(component.packages()?.[0].idUsuarioDestinatario).toBe('user-a');
    expect(component.myCommentCount()).toBe(1);
    expect(component.myReactionCount()).toBe(1);
  });

  it('oculta los datos anteriores y descarta respuestas tardías al cambiar de cuenta desde otra pestaña', () => {
    const urls = [
      `${environment.apiUrl}/publicaciones`,
      `${environment.apiUrl}/api/usuarios/me/unidades`,
      `${environment.apiUrl}/api/incidencias/mis-incidencias`,
      `${environment.apiUrl}/api/notificaciones`,
      `${environment.apiUrl}/api/reservas/mis-reservas`,
      `${environment.apiUrl}/api/paqueteria/mis-paquetes`,
    ];
    const oldRequests = urls.map(url => {
      const requests = http.match(url);
      expect(requests).toHaveLength(1);
      return requests[0];
    });
    setRemoteSession('user-b');
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(component.units()).toBeNull();
    flushRequests(http, 0, 'user-b');
    oldRequests.forEach(request => request.flush([]));
    fixture.detectChanges();

    expect(component.units()?.[0].edificioNombre).toBe('Edificio user-b');
    expect(component.incidents()?.[0].usuarioId).toBe('user-b');
    expect(component.reservations()?.[0].usuarioId).toBe('user-b');
    expect(component.packages()?.[0].idUsuarioDestinatario).toBe('user-b');
    expect(component.myCommentCount()).toBe(1);
  });
});
