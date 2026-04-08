import { Injectable, signal, computed } from '@angular/core';
import { Room, Station, EditorMode, ImageMeta, FloorPlanExport } from '../models/floor-plan';

@Injectable({ providedIn: 'root' })
export class FloorPlanService {
  // ── State ──────────────────────────────────────────────────────────────
  readonly rooms    = signal<Room[]>([]);
  readonly stations = signal<Station[]>([]);
  readonly mode     = signal<EditorMode>('view');
  readonly pendingRoomId = signal<string | null>(null);
  readonly image    = signal<ImageMeta | null>(null);
  readonly zoom     = signal<number>(1);
  readonly pan      = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // ── Derived ────────────────────────────────────────────────────────────
  readonly roomMap = computed<Record<string, Room>>(() => {
    const map: Record<string, Room> = {};
    this.rooms().forEach(r => (map[r.id] = r));
    return map;
  });

  readonly stationsForRoom = (roomId: string) =>
    computed(() => this.stations().filter(s => s.roomId === roomId));

  // ── Image ──────────────────────────────────────────────────────────────
  loadImage(file: File): void {
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

  // ── Rooms ──────────────────────────────────────────────────────────────
  addRoom(xPct: number, yPct: number): Room {
    const room: Room = {
      id: uid('room'),
      label: `Room ${this.rooms().length + 1}`,
      xPct,
      yPct,
    };
    this.rooms.update(rs => [...rs, room]);
    return room;
  }

  updateRoom(id: string, patch: Partial<Pick<Room, 'label' | 'xPct' | 'yPct'>>): void {
    this.rooms.update(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }

  deleteRoom(id: string): void {
    this.rooms.update(rs => rs.filter(r => r.id !== id));
    this.stations.update(ss => ss.filter(s => s.roomId !== id));
  }

  // ── Stations ───────────────────────────────────────────────────────────
  addStation(xPct: number, yPct: number, roomId: string): Station {
    const room = this.rooms().find(r => r.id === roomId);
    const idx  = this.stations().filter(s => s.roomId === roomId).length + 1;
    const station: Station = {
      id: uid('stn'),
      label: `${room?.label ?? 'Room'} — Station ${idx}`,
      xPct,
      yPct,
      roomId,
    };
    this.stations.update(ss => [...ss, station]);
    return station;
  }

  updateStation(id: string, patch: Partial<Pick<Station, 'label' | 'xPct' | 'yPct'>>): void {
    this.stations.update(ss => ss.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  deleteStation(id: string): void {
    this.stations.update(ss => ss.filter(s => s.id !== id));
  }

  // ── Mode ───────────────────────────────────────────────────────────────
  setMode(mode: EditorMode, pendingRoomId?: string): void {
    this.mode.set(mode);
    this.pendingRoomId.set(pendingRoomId ?? null);
  }

  // ── Zoom / Pan ─────────────────────────────────────────────────────────
  /** Call from canvas component, providing the focal point in canvas-local px. */
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

  // ── Misc ───────────────────────────────────────────────────────────────
  clearAll(): void {
    this.rooms.set([]);
    this.stations.set([]);
    this.setMode('view');
  }

  buildExport(): FloorPlanExport {
    const img      = this.image();
    const rooms    = this.rooms();
    const stations = this.stations();
    return {
      exportedAt: new Date().toISOString(),
      image: {
        filename:     img?.filename     ?? '',
        naturalWidth:  img?.naturalWidth  ?? 0,
        naturalHeight: img?.naturalHeight ?? 0,
      },
      rooms: rooms.map(r => ({
        id:         r.id,
        label:      r.label,
        position:   { xPct: round3(r.xPct), yPct: round3(r.yPct) },
        stationIds: stations.filter(s => s.roomId === r.id).map(s => s.id),
      })),
      stations: stations.map(s => ({
        id:        s.id,
        label:     s.label,
        position:  { xPct: round3(s.xPct), yPct: round3(s.yPct) },
        roomId:    s.roomId,
        roomLabel: rooms.find(r => r.id === s.roomId)?.label ?? '',
      })),
      connections: stations.map(s => ({ stationId: s.id, roomId: s.roomId })),
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
