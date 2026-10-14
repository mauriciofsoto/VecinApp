import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InquilinosList } from './inquilinos-list';

describe('InquilinosList', () => {
  let component: InquilinosList;
  let fixture: ComponentFixture<InquilinosList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InquilinosList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InquilinosList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
