import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrCode } from './qr-code';

describe('QrCode', () => {
  let component: QrCode;
  let fixture: ComponentFixture<QrCode>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCode]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrCode);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
