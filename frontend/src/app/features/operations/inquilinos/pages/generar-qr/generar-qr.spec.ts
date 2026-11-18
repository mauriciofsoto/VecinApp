import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { GenerarQr } from './generar-qr';
import { CodigosInvitacionService } from '../../../../../core/services/codigos-invitacion.service';
import { AuthService } from '../../../../../core/services/auth';
import { QrCode } from '../../../../../shared/components/molecules/qr-code/qr-code';

describe('GenerarQr', () => {
  let component: GenerarQr;
  let fixture: ComponentFixture<GenerarQr>;
  let respuesta = of({
    idEdificio: 4,
    nombreEdificio: 'Luzyfuerza',
    direccionEdificio: 'Calle 123',
    identificadorPublico: '80a94d4e-6417-4d14-89d2-11f823d94377',
  });
  let userId: ReturnType<typeof signal<string | null>>;
  let version: ReturnType<typeof signal<number>>;
  let obtenerQrComunidad: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    respuesta = of({
      idEdificio: 4,
      nombreEdificio: 'Luzyfuerza',
      direccionEdificio: 'Calle 123',
      identificadorPublico: '80a94d4e-6417-4d14-89d2-11f823d94377',
    });
    userId = signal('admin-4');
    version = signal(1);
    obtenerQrComunidad = vi.fn(() => respuesta);
    const auth = {
      captureSession: () => ({ userId: userId(), version: version() }),
      isCurrentSession: (session: { userId: string | null; version: number }) =>
        session.userId === userId() && session.version === version(),
    };

    await TestBed.configureTestingModule({
      imports: [GenerarQr],
      providers: [
        { provide: CodigosInvitacionService, useValue: { obtenerQrComunidad } },
        { provide: AuthService, useValue: auth },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenerarQr);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('usa una URL estable basada en el identificador público del edificio', () => {
    expect(component.enlace()).toBe(
      `${window.location.origin}/acceso/80a94d4e-6417-4d14-89d2-11f823d94377`,
    );
    const qr = fixture.debugElement.query(By.directive(QrCode)).componentInstance as QrCode;
    expect(qr.value()).toBe(component.enlace());
    expect(fixture.nativeElement.textContent).toContain('Luzyfuerza');
    expect(fixture.nativeElement.textContent).toContain('Calle 123');
  });

  it('oculta el enlace anterior mientras recarga y cuando falla la consulta', async () => {
    respuesta = throwError(() => ({ error: { message: 'No autorizado' } }));

    component.cargarQrComunitario();
    fixture.detectChanges();

    expect(component.identificadorPublico()).toBeNull();
    expect(fixture.debugElement.query(By.directive(QrCode))).toBeNull();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.error()).toBe('No autorizado');
    expect(component.enlace()).toBe('');
  });

  it('descarta el acceso cargado si cambia la sesión del administrador', async () => {
    userId.set('admin-1');
    version.update(value => value + 1);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.identificadorPublico()).toBeNull();
    expect(component.edificio()).toBeNull();
    expect(component.enlace()).toBe('');
    expect(component.error()).toContain('La sesión cambió');
  });

});
