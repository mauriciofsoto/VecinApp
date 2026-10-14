import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidenciasComponent } from './incidencias.component';

describe('IncidenciasComponent', () => {
  let component: IncidenciasComponent;
  let fixture: ComponentFixture<IncidenciasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidenciasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidenciasComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
