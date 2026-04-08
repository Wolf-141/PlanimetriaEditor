import { TestBed } from '@angular/core/testing';

import { FloorPlan } from './floor-plan';

describe('FloorPlan', () => {
  let service: FloorPlan;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FloorPlan);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});