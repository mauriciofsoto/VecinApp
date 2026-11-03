import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { ApiHealthService } from './api-health';

describe('ApiHealth', () => {
  let service: ApiHealthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ApiHealthService, provideHttpClient()] });
    service = TestBed.inject(ApiHealthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
