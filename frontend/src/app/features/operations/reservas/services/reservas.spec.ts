import { TestBed } from '@angular/core/testing';

import { Reservas } from './reservas';

describe('Reservas', () => {
  let service: Reservas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Reservas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
