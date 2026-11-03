import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Incidencias } from './incidencias';

describe('Incidencias', () => {
  let service: Incidencias;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Incidencias);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
