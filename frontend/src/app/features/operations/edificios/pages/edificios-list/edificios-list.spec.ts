import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import { AuthService } from '../../../../../core/services/auth';
import { CodigosInvitacionService } from '../../../../../core/services/codigos-invitacion.service';
import { Edificio } from '../../models/edificio';
import { EdificiosService } from '../../services/edificios.service';
import { routes } from '../../../../../app.routes';
import { roleGuard } from '../../../../../core/guards/auth.guard';
import { EdificiosList } from './edificios-list';

const edificioBase: Edificio = {
  idEdificio: 7,
  accesoPublicoId: '98ac2166-fb99-4f7f-85bf-c671f2bbb101',
  nombre: 'Torre Centro',
  direccion: 'Calle 10',
  localidad: 'Rosario',
  provincia: 'Santa Fe',
  estado: 'Activo',
};

describe('EdificiosList', () => {
  let fixture: ComponentFixture<EdificiosList>;
  let component: EdificiosList;
  let service: {
    obtenerEdificios: ReturnType<typeof vi.fn>;
    crearEdificio: ReturnType<typeof vi.fn>;
    actualizarEdificio: ReturnType<typeof vi.fn>;
    cambiarEstado: ReturnType<typeof vi.fn>;
  };
  let invitaciones: { crearCodigoAdministrador: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = {
      obtenerEdificios: vi.fn(() => of([edificioBase])),
      crearEdificio: vi.fn(() => of({ ...edificioBase, idEdificio: 8 })),
      actualizarEdificio: vi.fn(() => of({ ...edificioBase, nombre: 'Torre Nueva' })),
      cambiarEstado: vi.fn(() => of({ ...edificioBase, estado: 'Inactivo' as const })),
    };
    invitaciones = {
      crearCodigoAdministrador: vi.fn(() => of({
        codigo: 'CODIGO-ADMIN-123', idEdificio: 7, fechaExpiracion: '2026-11-25T00:00:00Z', usosMaximos: 1,
      })),
    };

    await TestBed.configureTestingModule({
      imports: [EdificiosList],
      providers: [
        { provide: EdificiosService, useValue: service },
        { provide: CodigosInvitacionService, useValue: invitaciones },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EdificiosList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga edificios y busca por localidad, provincia y estado', () => {
    expect(component.edificios()).toEqual([edificioBase]);
    component.busqueda.set('santa fe');
    expect(component.filtrados()).toEqual([edificioBase]);
    component.busqueda.set('inactivo');
    expect(component.filtrados()).toEqual([]);
  });

  it('preserva el identificador público recibido al actualizar el edificio', () => {
    component.editarEdificio(edificioBase);
    component.nombre = 'Torre Nueva';
    component.guardarEdificio();

    expect(service.actualizarEdificio).toHaveBeenCalledWith(7, {
      nombre: 'Torre Nueva', direccion: 'Calle 10', localidad: 'Rosario', provincia: 'Santa Fe',
    });
    expect(component.edificios()[0].accesoPublicoId).toBe(edificioBase.accesoPublicoId);
  });

  it('agrega el UUID que devuelve el servidor al crear un edificio', () => {
    component.nombre = 'Torre Nueva';
    component.direccion = 'Calle 10';
    component.localidad = 'Rosario';
    component.provincia = 'Santa Fe';
    component.guardarEdificio();

    expect(component.edificios()).toHaveLength(2);
    expect(component.edificios()[1].accesoPublicoId).toBe(edificioBase.accesoPublicoId);
  });

  it('protege la ruta de edificios exclusivamente para SuperAdministrador', () => {
    const mainLayout = routes.find(route => route.path === '');
    const adminRoutes = mainLayout?.children?.find(route => route.path === 'admin')?.children;
    const edificiosRoute = adminRoutes?.find(route => route.path === 'edificios');

    expect(edificiosRoute?.canActivate).toEqual([roleGuard]);
    expect(edificiosRoute?.data?.['roles']).toEqual(['SuperAdministrador']);
  });

  it('muestra la acción de invitación solo al SuperAdministrador', () => {
    const auth = TestBed.inject(AuthService);
    auth.currentUser.set({ id: 'user-1', nombre: 'Admin', apellido: 'Root', email: 'root@test.local', rol: 'Administrador', declaraUnidadesAlquiladas: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Invitar Administrador');

    auth.currentUser.set({ id: 'user-2', nombre: 'Super', apellido: 'Admin', email: 'super@test.local', rol: 'SuperAdministrador', declaraUnidadesAlquiladas: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Invitar Administrador');
  });

  it('genera para el edificio seleccionado y arma enlace al registro con el código del backend', () => {
    TestBed.inject(AuthService).currentUser.set({ id: 'super', nombre: 'Super', apellido: 'Admin', email: 'super@test.local', rol: 'SuperAdministrador', declaraUnidadesAlquiladas: false });

    component.invitarAdministrador(edificioBase);

    expect(invitaciones.crearCodigoAdministrador).toHaveBeenCalledWith(7);
    const enlace = new URL(component.enlaceInvitacion());
    expect(enlace.origin).toBe(window.location.origin);
    expect(enlace.pathname).toBe('/registro-administrador');
    expect(enlace.searchParams.get('codigo')).toBe('CODIGO-ADMIN-123');
    expect(component.invitacionEdificioId()).toBe(7);
  });

  it('envía una sola solicitud mientras la generación está pendiente', () => {
    let responder: ((value: { codigo: string; idEdificio: number; fechaExpiracion: string; usosMaximos: number }) => void) | undefined;
    invitaciones.crearCodigoAdministrador.mockImplementation(() => new Observable(observer => {
      responder = value => observer.next(value);
    }));
    TestBed.inject(AuthService).currentUser.set({ id: 'super', nombre: 'Super', apellido: 'Admin', email: 'super@test.local', rol: 'SuperAdministrador', declaraUnidadesAlquiladas: false });

    component.invitarAdministrador(edificioBase);
    component.invitarAdministrador(edificioBase);

    expect(invitaciones.crearCodigoAdministrador).toHaveBeenCalledTimes(1);
    responder?.({ codigo: 'C', idEdificio: 7, fechaExpiracion: '', usosMaximos: 1 });
  });

  it('copia el enlace y comunica errores de portapapeles', async () => {
    component.enlaceInvitacion.set('https://vecinapp.test/registro-administrador?codigo=C');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    await component.copiarEnlaceInvitacion();
    expect(writeText).toHaveBeenCalledWith(component.enlaceInvitacion());
    expect(component.enlaceCopiado()).toBe(true);

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    await component.copiarEnlaceInvitacion();
    expect(component.esError()).toBe(true);
    expect(component.mensaje()).toContain('No se pudo copiar');
  });

  it('muestra el error devuelto al fallar la generación', () => {
    invitaciones.crearCodigoAdministrador.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'Edificio no encontrado.' } })));
    TestBed.inject(AuthService).currentUser.set({ id: 'super', nombre: 'Super', apellido: 'Admin', email: 'super@test.local', rol: 'SuperAdministrador', declaraUnidadesAlquiladas: false });
    component.invitarAdministrador(edificioBase);
    expect(component.mensaje()).toBe('Edificio no encontrado.');
    expect(component.esError()).toBe(true);
    expect(component.generandoInvitacionId()).toBeNull();
  });
});
