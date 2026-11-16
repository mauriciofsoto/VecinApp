import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { Paquete } from '../../models/paquete';
import { ChatPaquete } from './chat-paquete';

describe('ChatPaquete', () => {
  let fixture: ComponentFixture<ChatPaquete>;
  let component: ChatPaquete;
  let http: HttpTestingController;
  const paquete: Paquete = {
    id: 17,
    identificacion: 'Caja 17',
    remitente: 'Correo',
    idUsuarioDestinatario: 'identity-abc',
    nombreDestinatario: 'Ana',
    apellidoDestinatario: 'Pérez',
    estado: 'Pendiente',
    fechaRecepcion: '2026-11-15T10:00:00Z',
    fechaEntrega: null,
    fechaConfirmacion: null,
    observaciones: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatPaquete],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatPaquete);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('paquete', paquete);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('carga el historial persistido y envía solo contenido, incorporando el DTO del servidor', () => {
    const get = http.expectOne(`${environment.apiUrl}/api/paqueteria/17/mensajes`);
    expect(get.request.method).toBe('GET');
    get.flush([{ id: 5, nombreEmisor: 'Ana', apellidoEmisor: 'Pérez', contenido: 'Hola', fechaEnvio: '2026-11-15T10:00:00Z' }]);
    expect(component.mensajes().map(message => message.contenido)).toEqual(['Hola']);

    component.enviarMensaje('Recibido');
    const post = http.expectOne(`${environment.apiUrl}/api/paqueteria/17/mensajes`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ contenido: 'Recibido' });
    post.flush({ id: 6, nombreEmisor: 'Ana', apellidoEmisor: 'Pérez', contenido: 'Recibido', fechaEnvio: '2026-11-15T10:01:00Z' });

    expect(component.mensajes().map(message => message.contenido)).toEqual(['Hola', 'Recibido']);
    expect(component.mensajes()[1].propio).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Ana Pérez');
  });
});
