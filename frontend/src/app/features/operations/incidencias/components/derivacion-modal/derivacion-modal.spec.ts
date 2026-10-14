import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DerivacionModal } from './derivacion-modal';

describe('DerivacionModal', () => {
  let component: DerivacionModal;
  let fixture: ComponentFixture<DerivacionModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DerivacionModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DerivacionModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
