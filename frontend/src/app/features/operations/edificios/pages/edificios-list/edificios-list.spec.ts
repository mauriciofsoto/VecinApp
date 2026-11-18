import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

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

  beforeEach(async () => {
    service = {
      obtenerEdificios: vi.fn(() => of([edificioBase])),
      crearEdificio: vi.fn(() => of({ ...edificioBase, idEdificio: 8 })),
      actualizarEdificio: vi.fn(() => of({ ...edificioBase, nombre: 'Torre Nueva' })),
      cambiarEstado: vi.fn(() => of({ ...edificioBase, estado: 'Inactivo' as const })),
    };

    await TestBed.configureTestingModule({
      imports: [EdificiosList],
      providers: [{ provide: EdificiosService, useValue: service }],
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
});
