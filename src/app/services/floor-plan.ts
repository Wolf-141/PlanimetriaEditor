import { Injectable, signal, computed, inject, Signal } from '@angular/core';
import { Meeting, Room, Station, EditorMode, ImageMeta, FloorPlanExport } from '../models/floor-plan';
import { DxfConverterService } from './dxf-converter';

@Injectable({ providedIn: 'root' })
export class FloorPlanService {
  private readonly dxfConverter = inject(DxfConverterService);

  // State
  readonly rooms = signal<Room[]>([]);
  readonly meetings = signal<Meeting[]>([]);
  readonly stations = signal<Station[]>([]);
  readonly mode = signal<EditorMode>('view');
  readonly pendingRoomId = signal<string | null>(null);
  readonly image = signal<ImageMeta | null>(null);
  readonly zoom = signal<number>(1);
  readonly pan = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  /** Set when a file load fails (DXF parse error, unreadable file, etc.). */
  readonly loadError = signal<string | null>(null);

  // Derived
  readonly roomMap = computed<Record<string, Room>>(() => {
    const map: Record<string, Room> = {};
    this.rooms().forEach((r) => (map[r.id] = r));
    return map;
  });

  readonly meetingMap = computed<Record<string, Meeting>>(() => {
    const map: Record<string, Meeting> = {};
    this.meetings().forEach((m) => (map[m.id] = m));
    return map;
  });

  /**
   * Returns a stable cached computed signal for the given roomId.
   * Calling this repeatedly with the same ID never creates duplicate computed instances.
   */
  private readonly _stationsForRoomCache = new Map<string, Signal<Station[]>>();

  stationsForRoom(roomId: string): Signal<Station[]> {
    let sig = this._stationsForRoomCache.get(roomId);
    if (!sig) {
      sig = computed(() => this.stations().filter((s) => s.roomId === roomId));
      this._stationsForRoomCache.set(roomId, sig);
    }
    return sig;
  }

  // Image
  loadImage(file: File): void {
    this.loadError.set(null);

    if (file.name.toLowerCase().endsWith('.dxf')) {
      this.loadDxf(file);
      return;
    }

    // PNG / SVG and any other browser-native raster format
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        this.image.set({
          filename: file.name,
          dataUrl,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        });
        this.setMode('view');
        this.resetView();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  private loadDxf(file: File): void {
    const reader = new FileReader();
    reader.onerror = () => {
      this.loadError.set('Could not read the DXF file.');
    };
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const { dataUrl, naturalWidth, naturalHeight } = this.dxfConverter.convert(text);
        this.image.set({ filename: file.name, dataUrl, naturalWidth, naturalHeight });
        this.setMode('view');
        this.resetView();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.loadError.set(`DXF conversion failed: ${msg}`);
      }
    };
    reader.readAsText(file);
  }

  // Rooms
  addRoom(xPct: number, yPct: number): Room {
    const room: Room = {
      id: crypto.randomUUID(),
      label: `Room ${this.rooms().length + 1}`,
      xPct,
      yPct,
    };
    this.rooms.update((rs) => [...rs, room]);
    return room;
  }

  updateRoom(id: string, patch: Partial<Pick<Room, 'label' | 'xPct' | 'yPct'>>): void {
    this.rooms.update((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  deleteRoom(id: string): void {
    this.rooms.update((rs) => rs.filter((r) => r.id !== id));
    this.stations.update((ss) => ss.filter((s) => s.roomId !== id));
  }

  // Meetings
  addMeeting(xPct: number, yPct: number): Meeting {
    const meeting: Meeting = {
      id: crypto.randomUUID(),
      label: `Meeting Room ${this.meetings().length + 1}`,
      xPct,
      yPct,
    };
    this.meetings.update((ms) => [...ms, meeting]);
    return meeting;
  }

  updateMeeting(id: string, patch: Partial<Pick<Meeting, 'label' | 'xPct' | 'yPct'>>): void {
    this.meetings.update((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  deleteMeeting(id: string): void {
    this.meetings.update((ms) => ms.filter((m) => m.id !== id));
  }

  // Stations
  addStation(xPct: number, yPct: number, roomId: string): Station {
    const room = this.rooms().find((r) => r.id === roomId);
    const idx = this.stations().filter((s) => s.roomId === roomId).length + 1;
    const station: Station = {
      id: crypto.randomUUID(),
      label: `Station ${idx}`,
      xPct,
      yPct,
      roomId,
    };
    this.stations.update((ss) => [...ss, station]);
    return station;
  }

  updateStation(id: string, patch: Partial<Pick<Station, 'label' | 'xPct' | 'yPct'>>): void {
    this.stations.update((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  deleteStation(id: string): void {
    this.stations.update((ss) => ss.filter((s) => s.id !== id));
  }

  // Mode
  setMode(mode: EditorMode, pendingRoomId?: string): void {
    this.mode.set(mode);
    this.pendingRoomId.set(pendingRoomId ?? null);
  }

  // Zoom / Pan
  applyZoom(factor: number, focalX: number, focalY: number): void {
    const current = this.zoom();
    const next = Math.max(0.2, Math.min(8, current * factor));
    const { x, y } = this.pan();
    this.zoom.set(next);
    this.pan.set({
      x: focalX - (focalX - x) * (next / current),
      y: focalY - (focalY - y) * (next / current),
    });
  }

  setPan(x: number, y: number): void {
    this.pan.set({ x, y });
  }

  resetView(): void {
    this.zoom.set(1);
    this.pan.set({ x: 0, y: 0 });
  }

  // Import
  importFromExport(data: FloorPlanExport): void {
    const meetings: Meeting[] = data.meetings.map((m) => ({
      id: m.id,
      label: m.label,
      xPct: m.position.xPct,
      yPct: m.position.yPct,
    }));

    const rooms: Room[] = data.rooms.map((r) => ({
      id: r.id,
      label: r.label,
      xPct: r.position.xPct,
      yPct: r.position.yPct,
    }));

    const stations: Station[] = data.rooms.flatMap((r) =>
      r.stations.map((s) => ({
        id: s.id,
        label: s.label,
        xPct: s.position.xPct,
        yPct: s.position.yPct,
        roomId: r.id,
      })),
    );

    this.meetings.set(meetings);
    this.rooms.set(rooms);
    this.stations.set(stations);
    this.setMode('view');
    this.resetView();
  }

  // Misc
  clearAll(): void {
    this.rooms.set([]);
    this.meetings.set([]);
    this.stations.set([]);
    this.image.set(null);
    this.setMode('view');
  }

  buildExport(): FloorPlanExport {
    const img = this.image();
    const meetings = this.meetings();
    const rooms = this.rooms();
    const stations = this.stations();
    return {
      exportedAt: new Date().toISOString(),
      image: {
        filename: img?.filename ?? '',
        naturalWidth: img?.naturalWidth ?? 0,
        naturalHeight: img?.naturalHeight ?? 0,
      },
      meetings: meetings.map((m) => ({
        id: m.id,
        label: m.label,
        position: { xPct: round3(m.xPct), yPct: round3(m.yPct) },
      })),
      rooms: rooms.map((r) => ({
        id: r.id,
        label: r.label,
        position: { xPct: round3(r.xPct), yPct: round3(r.yPct) },
        stations: stations
          .filter((s) => s.roomId === r.id)
          .map((s) => ({
            id: s.id,
            label: s.label,
            position: { xPct: round3(s.xPct), yPct: round3(s.yPct) },
          })),
      })),
    };
  }
}

// Helpers
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}