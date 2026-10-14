import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResponderEncuesta } from './responder-encuesta';

describe('ResponderEncuesta', () => {
  let component: ResponderEncuesta;
  let fixture: ComponentFixture<ResponderEncuesta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponderEncuesta]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResponderEncuesta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
