import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroInquilino } from './registro-inquilino';

describe('RegistroInquilino', () => {
  let component: RegistroInquilino;
  let fixture: ComponentFixture<RegistroInquilino>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroInquilino]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistroInquilino);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
