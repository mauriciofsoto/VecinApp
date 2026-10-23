import { TestBed } from '@angular/core/testing';

import { ApiHealth } from './api-health';

describe('ApiHealth', () => {
  let service: ApiHealth;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiHealth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
