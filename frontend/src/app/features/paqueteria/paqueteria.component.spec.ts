import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaqueteriaComponent } from './paqueteria.component';

describe('PaqueteriaComponent', () => {
  let component: PaqueteriaComponent;
  let fixture: ComponentFixture<PaqueteriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaqueteriaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaqueteriaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
