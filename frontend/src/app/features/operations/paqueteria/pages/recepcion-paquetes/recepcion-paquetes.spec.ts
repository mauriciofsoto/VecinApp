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
    rol: 'Inquilino',
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
    rol: 'Propietario',
    unidadesDeclaradas: [],
  },
];

describe('RecepcionPaquetes', () => {
  let fixture: ComponentFixture<RecepcionPaquetes>;
  let component: RecepcionPaquetes;
  let http: HttpTestingController;

  beforeEach(async () => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
      HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    }
    localStorage.setItem('accessToken', 'test-token');
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
  });

  function expectDestinatariosRequest() {
    const request = http.expectOne(`${environment.apiUrl}/api/paqueteria/destinatarios`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    return request;
  }

  it('muestra carga y obtiene destinatarios reales mostrando solo nombre y referencias declaradas', () => {
    expect(fixture.nativeElement.textContent).toContain('Cargando destinatarios');
    expectDestinatariosRequest().flush(destinatarios);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.register-button')?.click();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('María Gómez');
    expect(text).toContain('Bruno Díaz');
    expect(text).toContain('Piso 3 · Unidad B');
    expect(text).toContain('Piso 4 · Unidad A');
    expect(text).toContain('Sin unidad declarada');
    expect(text).not.toContain('Inquilino');
    expect(text).not.toContain('Propietario');
    expect(text).not.toContain('Otra referencia interna');
    expect(fixture.nativeElement.querySelectorAll('.recipient-card').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.recipient-card').textContent).not.toContain('identity-user');
  });

  it('busca por nombre y apellido y conserva el ID Identity como string al seleccionar', () => {
    expectDestinatariosRequest().flush(destinatarios);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.register-button')?.click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'Maria';
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

  it('permite seleccionar una persona sin unidades declaradas y no finge registrar el paquete', () => {
    expectDestinatariosRequest().flush(destinatarios);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.register-button')?.click();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.recipient-card') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    fixture.detectChanges();
    expect(component.destinatarioSeleccionadoId()).toBe('identity-user-57');
    expect(typeof component.destinatarioSeleccionadoId()).toBe('string');

    component.remitente = 'Correo';
    component.descripcion = 'Caja';
    component.intentarRegistrar();
    expect(component.paqueteria.paquetes().length).toBe(1);
    expect(component.mensajeRegistro()).toContain('No se registró el paquete');
  });

  it('recupera lista, contadores y chat, marcándolos como datos locales', () => {
    expectDestinatariosRequest().flush(destinatarios);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Registrar paquete');
    expect(text).toContain('Paquetes recibidos');
    expect(text).toContain('Estado pendiente (local): 1');
    expect(text).toContain('datos locales de demostración');

    (fixture.nativeElement.querySelector('.item-card') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-chat-paquete')).not.toBeNull();
  });

  it('muestra estado vacío y error sin conservar destinatarios ficticios', () => {
    expectDestinatariosRequest().flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay residentes activos');
    expect(component.destinatarios()).toEqual([]);
  });

  it('muestra el error de API y permite reintentar', () => {
    expectDestinatariosRequest().flush(
      { message: 'Unavailable' },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los destinatarios');
    expect(component.destinatarios()).toEqual([]);

    const retry = fixture.nativeElement.querySelector('.retry-button') as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    expectDestinatariosRequest().flush(destinatarios);
    fixture.detectChanges();
    expect(component.destinatarios().length).toBe(2);
  });
});
