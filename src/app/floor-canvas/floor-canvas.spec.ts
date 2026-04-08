import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloorCanvas } from './floor-canvas';

describe('FloorCanvas', () => {
  let component: FloorCanvas;
  let fixture: ComponentFixture<FloorCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorCanvas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloorCanvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
