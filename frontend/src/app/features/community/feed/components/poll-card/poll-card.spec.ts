import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PollCard } from './poll-card';

describe('PollCard', () => {
  let component: PollCard;
  let fixture: ComponentFixture<PollCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PollCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PollCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
