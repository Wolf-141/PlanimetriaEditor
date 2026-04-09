import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloorPlanEditorComponent } from './floor-plan-editor';
import { FloorPlanService } from '../services/floor-plan';

describe('FloorPlanEditorComponent', () => {
  let component: FloorPlanEditorComponent;
  let fixture: ComponentFixture<FloorPlanEditorComponent>;
  let service: FloorPlanService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorPlanEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloorPlanEditorComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(FloorPlanService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable room placement before an image is loaded', () => {
    expect(component.hasImage()).toBe(false);
    expect(component.isPlacingRoom()).toBe(false);
  });

  it('should update the counters from the service state', () => {
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 100,
      naturalHeight: 100,
    });
    service.addMeeting(5, 10);
    const room = service.addRoom(10, 20);
    service.addStation(15, 25, room.id);

    expect(component.roomCount()).toBe(1);
    expect(component.meetingCount()).toBe(1);
    expect(component.stationCount()).toBe(1);
    expect(component.hasImage()).toBe(true);
  });

  it('should toggle meeting-room placement mode', () => {
    component.toggleMeetingMode();
    expect(component.isPlacingMeeting()).toBe(true);

    component.toggleMeetingMode();
    expect(component.isPlacingMeeting()).toBe(false);
  });

  it('should require confirmation before clearing the editor state', () => {
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 100,
      naturalHeight: 100,
    });
    const room = service.addRoom(10, 20);
    service.addStation(15, 25, room.id);

    component.openClearConfirmation();
    expect(component.confirmClear()).toBe(true);

    component.clearAll();

    expect(component.confirmClear()).toBe(false);
    expect(service.image()).toBeNull();
    expect(service.meetings()).toHaveLength(0);
    expect(service.rooms()).toHaveLength(0);
    expect(service.stations()).toHaveLength(0);
  });
});
