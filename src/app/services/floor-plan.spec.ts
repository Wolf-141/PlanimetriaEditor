import { TestBed } from '@angular/core/testing';
import { FloorPlanService } from './floor-plan';

describe('FloorPlanService', () => {
  let service: FloorPlanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FloorPlanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add rooms and stations', () => {
    const room = service.addRoom(10, 20);
    const station = service.addStation(15, 25, room.id);

    expect(service.rooms()).toHaveLength(1);
    expect(service.stations()).toHaveLength(1);
    expect(station.roomId).toBe(room.id);
  });

  it('should delete stations associated with a removed room', () => {
    const room = service.addRoom(10, 20);
    service.addStation(15, 25, room.id);

    service.deleteRoom(room.id);

    expect(service.rooms()).toHaveLength(0);
    expect(service.stations()).toHaveLength(0);
  });

  it('should build an export with room and station references', () => {
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 800,
      naturalHeight: 600,
    });
    const room = service.addRoom(10.1234, 20.5678);
    const station = service.addStation(30.9876, 40.5432, room.id);

    const exported = service.buildExport();

    expect(exported.image.filename).toBe('plan.png');
    expect(exported.rooms[0].stationIds).toEqual([station.id]);
    expect(exported.stations[0].roomId).toBe(room.id);
    expect(exported.connections).toEqual([{ stationId: station.id, roomId: room.id }]);
    expect(exported.rooms[0].position).toEqual({ xPct: 10.123, yPct: 20.568 });
  });
});
