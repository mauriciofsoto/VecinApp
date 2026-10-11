import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecepcionPaquetes } from './recepcion-paquetes';

describe('RecepcionPaquetes', () => {
  let component: RecepcionPaquetes;
  let fixture: ComponentFixture<RecepcionPaquetes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecepcionPaquetes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecepcionPaquetes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
