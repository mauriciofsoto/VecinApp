import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GenerarQr } from './generar-qr';
import { CodigosInvitacionService } from '../../../../../core/services/codigos-invitacion.service';

describe('GenerarQr', () => {
  let component: GenerarQr;
  let fixture: ComponentFixture<GenerarQr>;
  const invitaciones = {
    obtenerQrComunidad: () => of({ identificadorPublico: '80a94d4e-6417-4d14-89d2-11f823d94377' }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerarQr],
      providers: [{ provide: CodigosInvitacionService, useValue: invitaciones }],
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
  });

});
