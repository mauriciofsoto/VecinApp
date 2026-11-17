import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { authInterceptor } from '../../../../../core/interceptors/auth.interceptor';
import { InquilinosList } from './inquilinos-list';

const comunidad = [
  { id: 'tenant-1', nombre: 'Ana', apellido: 'Gómez', email: 'ana@example.test', rol: 'Inquilino', estado: 'Activo', fechaRegistro: '2026-01-10T00:00:00Z', perfilComunitario: null, unidadesDeclaradas: [] },
  { id: 'owner-1', nombre: 'Beto', apellido: 'Díaz', email: 'beto@example.test', rol: 'Propietario', estado: 'Activo', fechaRegistro: '2026-01-11T00:00:00Z', perfilComunitario: 'Propietario', unidadesDeclaradas: [{ tipo: 'Residencial', pisoDeclarado: '2', identificacionDeclarada: 'B', esPrincipalDeclarada: true, estaAlquiladaDeclarada: null, estadoConfirmacion: 'Declarada', fechaDeclaracion: '2026-01-11T00:00:00Z' }] },
  { id: 'staff-1', nombre: 'Cora', apellido: 'Luna', email: 'cora@example.test', rol: 'Portero', estado: 'Desactivado', fechaRegistro: '2026-01-12T00:00:00Z', perfilComunitario: 'Personal', unidadesDeclaradas: [] },
  { id: 'admin-1', nombre: 'Admin', apellido: 'Test', email: 'admin@example.test', rol: 'Administrador', estado: 'Activo', fechaRegistro: '2026-01-12T00:00:00Z', perfilComunitario: null, unidadesDeclaradas: [] },
];

describe('InquilinosList', () => {
  let component: InquilinosList;
  let fixture: ComponentFixture<InquilinosList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.setItem('accessToken', 'test-token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 'admin-test', nombre: 'Admin', apellido: 'Test', email: 'admin@example.test', rol: 'Administrador',
    }));
    await TestBed.configureTestingModule({
      imports: [InquilinosList],
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InquilinosList);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authSessionRevision');
  });

  it('consulta el endpoint con el interceptor de autenticación y muestra carga', () => {
    expect(fixture.nativeElement.textContent).toContain('Cargando personas');
    const request = http.expectOne(req => req.url.endsWith('/api/usuarios/comunidad'));
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush(comunidad);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ana Gómez');
  });

  it('muestra los perfiles comunitarios, excluye administradores y etiqueta Portero como Personal', () => {
    http.expectOne(req => req.url.endsWith('/api/usuarios/comunidad')).flush(comunidad);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(component.filtrados().length).toBe(3);
    expect(text).toContain('Inquilino');
    expect(text).toContain('Propietario');
    expect(text).toContain('Personal');
    expect(text).not.toContain('Admin Test');
    expect(text).toContain('Unidades declaradas (sin verificación)');
    expect(text).toContain('Declarada');
  });

  it('filtra por rol real y busca por nombre completo o email', () => {
    http.expectOne(req => req.url.endsWith('/api/usuarios/comunidad')).flush(comunidad);
    component.filtroPerfil.set('Portero');
    fixture.detectChanges();
    expect(component.filtrados().map(item => item.id)).toEqual(['staff-1']);

    component.filtroPerfil.set('todos');
    component.busqueda.set('beto díaz');
    expect(component.filtrados().map(item => item.id)).toEqual(['owner-1']);
    component.busqueda.set('cora@example.test');
    expect(component.filtrados().map(item => item.id)).toEqual(['staff-1']);
  });

  it('muestra el estado vacío cuando el backend devuelve una lista vacía', () => {
    http.expectOne(req => req.url.endsWith('/api/usuarios/comunidad')).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay personas que coincidan');
  });

  it('muestra un error de autorización, conserva datos anteriores y permite reintentar sin duplicar el alta', () => {
    const request = http.expectOne(req => req.url.endsWith('/api/usuarios/comunidad'));
    request.flush(comunidad);
    fixture.detectChanges();

    component.cargar();
    const retry = http.expectOne(req => req.url.endsWith('/api/usuarios/comunidad'));
    retry.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('no tiene permiso');
    expect(component.personas().length).toBe(4);
  });

  it('informa cuando la sesión venció o falta autorización', () => {
    http.expectOne(req => req.url.endsWith('/api/usuarios/comunidad'))
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La sesión venció');
  });
});
