import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearIncidencia } from './crear-incidencia';

describe('CrearIncidencia', () => {
  let component: CrearIncidencia;
  let fixture: ComponentFixture<CrearIncidencia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearIncidencia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearIncidencia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
