import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { authInterceptor } from '../../../../../core/interceptors/auth.interceptor';
import { environment } from '../../../../../../environments/environment';
import { RecepcionPaquetes } from './recepcion-paquetes';
import { DestinatarioPaquete } from '../../models/destinatario-paquete';

const destinatarios: DestinatarioPaquete[] = [
  {
    id: 'identity-user-42',
    nombre: 'María',
    apellido: 'Gómez',
    unidadesDeclaradas: [
      { pisoDeclarado: '3', identificacionDeclarada: 'B', estadoConfirmacion: 'Declarada' },
      { pisoDeclarado: '3', identificacionDeclarada: 'B', estadoConfirmacion: 'Otra referencia interna' },
      { pisoDeclarado: '4', identificacionDeclarada: 'A', estadoConfirmacion: 'Declarada' },
    ],
  },
  {
    id: 'identity-user-57',
    nombre: 'Bruno',
    apellido: 'Díaz',
    unidadesDeclaradas: [],
  },
];

const unidades = [
  {
    id: 3,
    piso: '3',
    identificacion: 'B',
    residentes: [{ id: 'identity-user-42', nombre: 'María', apellido: 'Gómez', rol: 'Inquilino' }],
  },
];

describe('RecepcionPaquetes', () => {
  let fixture: ComponentFixture<RecepcionPaquetes>;
  let component: RecepcionPaquetes;
  let http: HttpTestingController;
  const paquete = {
    id: 17,
    identificacion: 'Caja 17',
    remitente: 'Correo',
    idUsuarioDestinatario: 'identity-user-57',
    nombreDestinatario: 'Bruno',
    apellidoDestinatario: 'Díaz',
    estado: 'Pendiente',
    fechaRecepcion: '2026-11-15T10:00:00Z',
    fechaEntrega: null,
    fechaConfirmacion: null,
    observaciones: null,
  };

  beforeEach(async () => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
      HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    }
    localStorage.setItem('accessToken', 'test-token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 'porter-test', nombre: 'Portero', apellido: 'Test', email: 'porter@example.test', rol: 'Portero',
    }));
    await TestBed.configureTestingModule({
      imports: [RecepcionPaquetes],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecepcionPaquetes);
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

  function expectDestinatariosRequest() {
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria/destinatarios`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    return request;
  }

  function expectListRequest() {
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    return request;
  }

  function expectUnidadesRequest() {
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria/unidades-destinatarios`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    return request;
  }

  function loadInitialData(paquetes = [paquete]) {
    expectDestinatariosRequest().flush(destinatarios);
    expectUnidadesRequest().flush(unidades);
    expectListRequest().flush(paquetes);
    fixture.detectChanges();
  }

  it('mantiene vacía la lista inicial y carga opciones de unidades del edificio', () => {
    expect(fixture.nativeElement.textContent).toContain('Cargando destinatarios');
    loadInitialData([]);

    fixture.nativeElement.querySelector('.register-button')?.click();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('La lista está vacía. Buscá por nombre o elegí piso y departamento.');
    expect(fixture.nativeElement.querySelectorAll('.recipient-card').length).toBe(0);
    expect(fixture.nativeElement.querySelector('select[name="pisoDestinatario"] option[value="3"]')).not.toBeNull();
  });

  it('busca por nombre y apellido y conserva el ID Identity como string al seleccionar', () => {
    loadInitialData([]);

    fixture.nativeElement.querySelector('.register-button')?.click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'Ma';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.recipient-card').length).toBe(0);

    input.value = 'Mar';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const resultadosMaria = fixture.nativeElement.querySelectorAll('.recipient-card') as NodeListOf<HTMLButtonElement>;
    expect(resultadosMaria.length).toBe(1);
    expect(resultadosMaria[0].textContent).toContain('María Gómez');

    input.value = 'Díaz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.recipient-card') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toContain('Bruno Díaz');
    buttons[0].click();
    fixture.detectChanges();

    expect(component.destinatarioSeleccionadoId()).toBe('identity-user-57');
    expect(typeof component.destinatarioSeleccionadoId()).toBe('string');
    expect(fixture.nativeElement.textContent).toContain('Destinatario: Bruno Díaz');
  });

  it('registra para una persona sin unidad y conserva su ID Identity string', () => {
    loadInitialData([]);
    fixture.nativeElement.querySelector('.register-button')?.click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'Bruno';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.recipient-card') as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    fixture.detectChanges();
    expect(component.destinatarioSeleccionadoId()).toBe('identity-user-57');
    expect(typeof component.destinatarioSeleccionadoId()).toBe('string');

    component.remitente = 'Correo';
    component.identificacion = 'Caja';
    component.intentarRegistrar();
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      idUsuarioDestinatario: 'identity-user-57',
      idUnidad: null,
      remitente: 'Correo',
      identificacion: 'Caja',
      observaciones: null,
    });
    request.flush({ ...paquete, identificacion: 'Caja' });
    expect(component.paqueteria.paquetes()[0].id).toBe(17);
    expect(component.mensajeRegistro()).toContain('registrado correctamente');
  });

  it('muestra la lista recibida del backend y carga el chat desde el endpoint', () => {
    loadInitialData();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Registrar paquete');
    expect(text).toContain('Paquetes recibidos');
    expect(text).toContain('Caja 17');
    expect(text).toContain('Pendientes: 1');
    expect(text).not.toContain('demostración');

    (fixture.nativeElement.querySelector('.item-card') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-chat-paquete')).not.toBeNull();
    const messages = http.expectOne(`${environment.apiUrl}/api/paqueteria/17/mensajes`);
    expect(messages.request.method).toBe('GET');
    messages.flush([]);
  });

  it('registra entrega física y actualiza el listado con la respuesta GET del backend', () => {
    loadInitialData();
    component.registrarEntrega(paquete as never);
    const post = http.expectOne(`${environment.apiUrl}/api/paqueteria/17/entrega`);
    expect(post.request.method).toBe('POST');
    post.flush(null);
    const refresh = http.expectOne(`${environment.apiUrl}/api/paqueteria`);
    refresh.flush([{ ...paquete, estado: 'Entregado', fechaEntrega: '2026-11-15T11:00:00Z' }]);
    expect(component.paqueteria.paquetes()[0].estado).toBe('Entregado');
  });

  it('muestra estado vacío y error sin conservar destinatarios ficticios', () => {
    expectDestinatariosRequest().flush([]);
    expectUnidadesRequest().flush([]);
    expectListRequest().flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay residentes activos');
    expect(component.destinatarios()).toEqual([]);
  });

  it('muestra el error de API y permite reintentar', () => {
    expectDestinatariosRequest().flush(
      { message: 'Unavailable' },
      { status: 500, statusText: 'Server Error' },
    );
    expectUnidadesRequest().flush(unidades);
    expectListRequest().flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los destinatarios');
    expect(component.destinatarios()).toEqual([]);

    const retry = fixture.nativeElement.querySelector('.retry-button') as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    const retryRequest = http.expectOne(`${environment.apiUrl}/api/paqueteria/destinatarios`);
    retryRequest.flush(destinatarios);
    fixture.detectChanges();
    expect(component.destinatarios().length).toBe(2);
  });
});
