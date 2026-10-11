import { TestBed } from '@angular/core/testing';

import { Paqueteria } from './paqueteria';

describe('Paqueteria', () => {
  let service: Paqueteria;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Paqueteria);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
