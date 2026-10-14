import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InquilinoDetailModal } from './inquilino-detail-modal';

describe('InquilinoDetailModal', () => {
  let component: InquilinoDetailModal;
  let fixture: ComponentFixture<InquilinoDetailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InquilinoDetailModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InquilinoDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
