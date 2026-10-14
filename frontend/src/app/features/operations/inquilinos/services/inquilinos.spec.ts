import { TestBed } from '@angular/core/testing';

import { Inquilinos } from './inquilinos';

describe('Inquilinos', () => {
  let service: Inquilinos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Inquilinos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
