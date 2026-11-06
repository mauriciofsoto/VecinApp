import { TestBed } from '@angular/core/testing';

import { EncuestasService } from './encuestas';

describe('Encuestas', () => {
  let service: EncuestasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EncuestasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
