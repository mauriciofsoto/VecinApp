import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDeliveryModal } from './confirm-delivery-modal';

describe('ConfirmDeliveryModal', () => {
  let component: ConfirmDeliveryModal;
  let fixture: ComponentFixture<ConfirmDeliveryModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDeliveryModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmDeliveryModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
