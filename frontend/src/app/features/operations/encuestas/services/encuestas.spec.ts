import { TestBed } from '@angular/core/testing';

import { Encuestas } from './encuestas';

describe('Encuestas', () => {
  let service: Encuestas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Encuestas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
