import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerarQr } from './generar-qr';

describe('GenerarQr', () => {
  let component: GenerarQr;
  let fixture: ComponentFixture<GenerarQr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerarQr]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenerarQr);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
