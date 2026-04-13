import { TestBed } from '@angular/core/testing';

import { DxfConverter } from './dxf-converter';

describe('DxfConverter', () => {
  let service: DxfConverter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DxfConverter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
