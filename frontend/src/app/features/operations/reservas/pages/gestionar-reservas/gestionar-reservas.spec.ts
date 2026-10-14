import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionarReservas } from './gestionar-reservas';

describe('GestionarReservas', () => {
  let component: GestionarReservas;
  let fixture: ComponentFixture<GestionarReservas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarReservas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionarReservas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
