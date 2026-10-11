import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservaCalendarModal } from './reserva-calendar-modal';

describe('ReservaCalendarModal', () => {
  let component: ReservaCalendarModal;
  let fixture: ComponentFixture<ReservaCalendarModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservaCalendarModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReservaCalendarModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
