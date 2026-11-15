import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MisPaquetes } from './mis-paquetes';

describe('MisPaquetes', () => {
  let component: MisPaquetes;
  let fixture: ComponentFixture<MisPaquetes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisPaquetes],
      providers: [provideHttpClient()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MisPaquetes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
