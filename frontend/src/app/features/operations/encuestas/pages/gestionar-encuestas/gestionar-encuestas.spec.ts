import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionarEncuestas } from './gestionar-encuestas';

describe('GestionarEncuestas', () => {
  let component: GestionarEncuestas;
  let fixture: ComponentFixture<GestionarEncuestas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarEncuestas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionarEncuestas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
