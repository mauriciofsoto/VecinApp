import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedPrincipal } from './feed-principal';

describe('FeedPrincipal', () => {
  let component: FeedPrincipal;
  let fixture: ComponentFixture<FeedPrincipal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedPrincipal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedPrincipal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
