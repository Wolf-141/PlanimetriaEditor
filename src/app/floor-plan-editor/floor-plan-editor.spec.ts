import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloorPlanEditor } from './floor-plan-editor';

describe('FloorPlanEditor', () => {
  let component: FloorPlanEditor;
  let fixture: ComponentFixture<FloorPlanEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorPlanEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloorPlanEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
