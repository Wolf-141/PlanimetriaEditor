import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloorCanvasComponent } from './floor-canvas';
import { FloorPlanService } from '../services/floor-plan';

describe('FloorCanvasComponent', () => {
  let component: FloorCanvasComponent;
  let fixture: ComponentFixture<FloorCanvasComponent>;
  let service: FloorPlanService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloorCanvasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloorCanvasComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(FloorPlanService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the drop zone when no image is loaded', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.drop-zone')).not.toBeNull();
  });

  it('should render the scene after an image is loaded', () => {
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 100,
      naturalHeight: 100,
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.scene')).not.toBeNull();
    expect(compiled.querySelector('.floor-img')).not.toBeNull();
  });

  it('should render the associated room name next to each station marker', () => {
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 100,
      naturalHeight: 100,
    });
    const room = service.addRoom(20, 30);
    service.addStation(40, 50, room.id);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(room.label);
  });

  it('should render meeting room markers', () => {
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 100,
      naturalHeight: 100,
    });
    service.addMeeting(25, 35);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Meeting Room');
  });

  it('should only place markers inside the rendered image bounds', () => {
    setHostSize(fixture, 1000, 1000);
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 200,
      naturalHeight: 100,
    });

    fixture.detectChanges();
    component.onWindowResize();
    service.setMode('placing-room');

    component.onClick(createMouseEvent(100, 100));
    expect(service.rooms()).toHaveLength(0);

    component.onClick(createMouseEvent(500, 500));
    expect(service.rooms()).toHaveLength(1);
    expect(service.rooms()[0].xPct).toBe(50);
    expect(service.rooms()[0].yPct).toBe(50);
  });

  it('should place meeting rooms when the meeting mode is active', () => {
    setHostSize(fixture, 1000, 1000);
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 100,
      naturalHeight: 100,
    });

    fixture.detectChanges();
    component.onWindowResize();
    service.setMode('placing-meeting');

    component.onClick(createMouseEvent(500, 500));

    expect(service.meetings()).toHaveLength(1);
    expect(service.stations()).toHaveLength(0);
  });

  it('should clamp marker dragging to the image bounds', () => {
    setHostSize(fixture, 1000, 1000);
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 100,
      naturalHeight: 100,
    });

    fixture.detectChanges();
    component.onWindowResize();

    const room = service.addRoom(50, 50);
    component.onRoomDragStart({ id: room.id, mouseX: 500, mouseY: 500 });
    (component as unknown as { onMouseMoveOutside: (event: MouseEvent) => void }).onMouseMoveOutside(
      createMouseEvent(2500, -500),
    );

    expect(service.rooms()[0].xPct).toBe(100);
    expect(service.rooms()[0].yPct).toBe(0);
  });
});

function setHostSize(
  fixture: ComponentFixture<FloorCanvasComponent>,
  width: number,
  height: number,
): void {
  const host = fixture.nativeElement as HTMLElement;

  Object.defineProperty(host, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(host, 'clientHeight', { configurable: true, value: height });
  Object.defineProperty(host, 'offsetWidth', { configurable: true, value: width });
  Object.defineProperty(host, 'offsetHeight', { configurable: true, value: height });
  host.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
      toJSON: () => '',
    }) as DOMRect;
}

function createMouseEvent(clientX: number, clientY: number): MouseEvent {
  return {
    clientX,
    clientY,
    target: { closest: () => null },
  } as unknown as MouseEvent;
}
