import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InquilinosComponent } from './inquilinos.component';

describe('InquilinosComponent', () => {
  let component: InquilinosComponent;
  let fixture: ComponentFixture<InquilinosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InquilinosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InquilinosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
