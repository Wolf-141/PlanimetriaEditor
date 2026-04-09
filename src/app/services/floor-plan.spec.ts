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

  it('should add meeting rooms separately from standard rooms', () => {
    const meeting = service.addMeeting(12, 18);

    expect(service.meetings()).toHaveLength(1);
    expect(service.rooms()).toHaveLength(0);
    expect(meeting.label).toContain('Meeting Room');
  });

  it('should delete stations associated with a removed room', () => {
    const room = service.addRoom(10, 20);
    service.addStation(15, 25, room.id);

    service.deleteRoom(room.id);

    expect(service.rooms()).toHaveLength(0);
    expect(service.stations()).toHaveLength(0);
  });

  it('should build an export with meetings, rooms, and station references', () => {
    service.image.set({
      filename: 'plan.png',
      dataUrl: 'data:image/png;base64,abc',
      naturalWidth: 800,
      naturalHeight: 600,
    });
    const meeting = service.addMeeting(5.5555, 6.6666);
    const room = service.addRoom(10.1234, 20.5678);
    const station = service.addStation(30.9876, 40.5432, room.id);

    const exported = service.buildExport();

    expect(exported.image.filename).toBe('plan.png');
    expect(exported.meetings[0]).toEqual({
      id: meeting.id,
      label: meeting.label,
      position: { xPct: 5.556, yPct: 6.667 },
    });
    expect(exported.rooms[0].stationIds).toEqual([station.id]);
    expect(exported.stations[0].roomId).toBe(room.id);
    expect(exported.connections).toEqual([{ stationId: station.id, roomId: room.id }]);
    expect(exported.rooms[0].position).toEqual({ xPct: 10.123, yPct: 20.568 });
  });

  it('should import meetings from exported json', () => {
    service.importFromExport({
      exportedAt: new Date().toISOString(),
      image: {
        filename: 'plan.png',
        naturalWidth: 100,
        naturalHeight: 100,
      },
      meetings: [
        {
          id: 'meeting_1',
          label: 'Board Room',
          position: { xPct: 11, yPct: 22 },
        },
      ],
      rooms: [
        {
          id: 'room_1',
          label: 'Room 1',
          position: { xPct: 33, yPct: 44 },
          stationIds: ['stn_1'],
        },
      ],
      stations: [
        {
          id: 'stn_1',
          label: 'Desk 1',
          position: { xPct: 55, yPct: 66 },
          roomId: 'room_1',
          roomLabel: 'Room 1',
        },
      ],
      connections: [{ stationId: 'stn_1', roomId: 'room_1' }],
    });

    expect(service.meetings()).toHaveLength(1);
    expect(service.meetings()[0].label).toBe('Board Room');
    expect(service.rooms()).toHaveLength(1);
    expect(service.stations()).toHaveLength(1);
  });
});
