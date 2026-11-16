import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { Perfil } from './perfil';

describe('Perfil', () => {
  let fixture: ComponentFixture<Perfil>;
  let http: HttpTestingController;

  beforeEach(async () => {
    if (!HTMLDialogElement.prototype.showModal) {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { value(this: HTMLDialogElement) { this.setAttribute('open', ''); } });
    }
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Perfil);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.match(request => request.url.includes('/api/vinculaciones/solicitudes')).forEach(request => request.flush([]));
    http.verify();
  });

  it('muestra Personal para el rol Portero y no presenta información residencial', async () => {
    fixture.detectChanges();
    const request = http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`);
    request.flush({
      nombre: 'Luis', apellido: 'Gómez', email: 'luis@example.test', rol: 'Portero',
      telefono: null,
      edificioNombre: 'Edificio A', unidadesVinculadas: [], unidadesDeclaradas: [],
      viveEnEdificio: null, tieneOtrasUnidades: null, declaraUnidadesAlquiladas: null,
      modalidadAlquiler: null, funcionPersonal: 'Seguridad', funcionPersonalOtra: null, horarioPersonal: 'Noche',
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Personal');
    expect(fixture.nativeElement.textContent).toContain('Seguridad');
    expect(fixture.nativeElement.textContent).not.toContain('Unidades vinculadas');
    expect(fixture.nativeElement.textContent).not.toContain('Información de alquiler');
  });

  it('muestra un estado claro cuando no hay relaciones o datos adicionales', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`).flush({
      nombre: 'Eva', apellido: 'López', email: '', rol: 'Inquilino', edificioNombre: null,
      telefono: null,
      unidadesVinculadas: [], unidadesDeclaradas: [], viveEnEdificio: null, tieneOtrasUnidades: null,
      declaraUnidadesAlquiladas: null, modalidadAlquiler: null, funcionPersonal: null,
      funcionPersonalOtra: null, horarioPersonal: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay información registrada');
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay unidades vinculadas a tu cuenta.');
  });

  it('recupera y abre la solicitud persistida que llegó desde una notificación', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`).flush({
      nombre: 'Sofía', apellido: 'Luna', email: 'sofia@example.test', telefono: null,
      rol: 'Inquilino', edificioNombre: 'Torre A', unidadesVinculadas: [], unidadesDeclaradas: [],
      viveEnEdificio: true, tieneOtrasUnidades: null, declaraUnidadesAlquiladas: null,
      modalidadAlquiler: 'Directo', funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
    });
    http.expectOne(`${environment.apiUrl}/api/vinculaciones/solicitudes`).flush([]);
    fixture.componentInstance.abrirSolicitud(42);
    http.expectOne(`${environment.apiUrl}/api/vinculaciones/solicitudes?id=42`).flush([{
      id: 42, estado: 'Pendiente', miParteAcepto: false, otraParteAcepto: false,
      nombreOtraParte: 'Marta Sosa', rolOtraParte: 'Propietario', pisoUnidad: '6', identificacionUnidad: 'A',
      pisoResidenciaOtraParte: '2', identificacionResidenciaOtraParte: 'B',
      fechaCreacion: '2026-11-16T00:00:00Z', fechaRespuestaPropietario: null, fechaRespuestaInquilino: null,
    }]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.solicitudActiva()?.id).toBe(42);
    expect(fixture.componentInstance.modalSolicitudAbierto()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Marta Sosa');
    expect(fixture.nativeElement.textContent).toContain('Residencia declarada: 2 / B');
  });

  it('guarda y muestra el perfil devuelto por el servidor', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`).flush({
      nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test', telefono: null, rol: 'Inquilino',
      edificioNombre: 'Edificio A', unidadesVinculadas: [], unidadesDeclaradas: [],
      viveEnEdificio: true, tieneOtrasUnidades: null, declaraUnidadesAlquiladas: null,
      modalidadAlquiler: 'Contrato', funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.profile-page__header button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const nombre = fixture.nativeElement.querySelector('#profile-nombre input') as HTMLInputElement;
    nombre.value = 'Ana María';
    nombre.dispatchEvent(new Event('input', { bubbles: true }));
    const telefono = fixture.nativeElement.querySelector('#profile-telefono input') as HTMLInputElement;
    telefono.value = '+54 11 5555-1234';
    telefono.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.profile-edit-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    const update = http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ nombre: 'Ana María', apellido: 'Pérez', telefono: '+54 11 5555-1234' });
    expect(fixture.componentInstance.guardando()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Guardando…');
    update.flush({
      nombre: 'Ana María', apellido: 'Pérez', email: 'ana@example.test', telefono: '+54 11 5555-1234',
      rol: 'Inquilino', edificioNombre: 'Edificio A', unidadesVinculadas: [], unidadesDeclaradas: [],
      viveEnEdificio: true, tieneOtrasUnidades: null, declaraUnidadesAlquiladas: null,
      modalidadAlquiler: 'Contrato', funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana María');
    expect(fixture.nativeElement.textContent).toContain('+54 11 5555-1234');
    expect(fixture.nativeElement.textContent).toContain('Los cambios del perfil se guardaron correctamente.');
    expect(fixture.componentInstance.editando()).toBe(false);
    expect(fixture.componentInstance.guardando()).toBe(false);
  });

  it('descarta los cambios al cancelar la edición', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`).flush({
      nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test', telefono: null, rol: 'Inquilino',
      edificioNombre: null, unidadesVinculadas: [], unidadesDeclaradas: [], viveEnEdificio: null,
      tieneOtrasUnidades: null, declaraUnidadesAlquiladas: null, modalidadAlquiler: null,
      funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.profile-page__header button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const nombre = fixture.nativeElement.querySelector('#profile-nombre input') as HTMLInputElement;
    nombre.value = 'Cambio sin guardar';
    nombre.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    const cancel = Array.from(fixture.nativeElement.querySelectorAll('.profile-edit-form button'))
      .find(button => (button as HTMLButtonElement).textContent?.includes('Cancelar')) as HTMLButtonElement;
    cancel.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.formulario.controls.nombre.value).toBe('Ana');
    expect(fixture.nativeElement.textContent).toContain('Ana Pérez');
    expect(fixture.componentInstance.editando()).toBe(false);
    http.expectNone(`${environment.apiUrl}/api/usuarios/me/perfil`, 'PUT');
  });

  it('mantiene la edición abierta y muestra errores devueltos por el servidor', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`).flush({
      nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test', telefono: null, rol: 'Inquilino',
      edificioNombre: null, unidadesVinculadas: [], unidadesDeclaradas: [], viveEnEdificio: null,
      tieneOtrasUnidades: null, declaraUnidadesAlquiladas: null, modalidadAlquiler: null,
      funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.profile-page__header button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.profile-edit-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    const update = http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`);
    update.flush({ errors: { Nombre: ['El nombre es obligatorio.'] } }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.editando()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('El nombre es obligatorio.');
    expect(fixture.nativeElement.textContent).not.toContain('Los cambios del perfil se guardaron correctamente.');
  });

  it('valida los campos localmente sin enviar una petición inválida', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`).flush({
      nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test', telefono: null, rol: 'Inquilino',
      edificioNombre: null, unidadesVinculadas: [], unidadesDeclaradas: [], viveEnEdificio: null,
      tieneOtrasUnidades: null, declaraUnidadesAlquiladas: null, modalidadAlquiler: null,
      funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.profile-page__header button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const nombre = fixture.nativeElement.querySelector('#profile-nombre input') as HTMLInputElement;
    nombre.value = '   ';
    nombre.dispatchEvent(new Event('input', { bubbles: true }));
    (fixture.nativeElement.querySelector('.profile-edit-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Este campo no puede contener solo espacios.');
    expect(fixture.componentInstance.guardando()).toBe(false);
    http.expectNone(`${environment.apiUrl}/api/usuarios/me/perfil`);
  });

  it('mantiene la edición abierta y comunica un error de conexión', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`).flush({
      nombre: 'Ana', apellido: 'Pérez', email: 'ana@example.test', telefono: null, rol: 'Inquilino',
      edificioNombre: null, unidadesVinculadas: [], unidadesDeclaradas: [], viveEnEdificio: null,
      tieneOtrasUnidades: null, declaraUnidadesAlquiladas: null, modalidadAlquiler: null,
      funcionPersonal: null, funcionPersonalOtra: null, horarioPersonal: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.profile-page__header button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.profile-edit-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/api/usuarios/me/perfil`).error(new ProgressEvent('error'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.editando()).toBe(true);
    expect(fixture.componentInstance.guardando()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No se pudieron guardar los cambios.');
  });
});
