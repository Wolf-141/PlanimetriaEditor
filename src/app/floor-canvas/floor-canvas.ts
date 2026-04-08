import {
  Component, ElementRef, HostListener, inject,
  computed, ViewChild, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloorPlanService } from '../services/floor-plan';
import { RoomMarkerComponent, MarkerDragStart } from '../markers/room-marker';
import { StationMarkerComponent } from '../markers/station-marker';

interface DragState {
  type: 'room' | 'station';
  id: string;
  startMouseX: number;
  startMouseY: number;
  startXPct: number;
  startYPct: number;
}

@Component({
  selector: 'app-floor-canvas',
  standalone: true,
  imports: [CommonModule, RoomMarkerComponent, StationMarkerComponent],
  templateUrl: './floor-canvas.html',
  styleUrls: ['./floor-canvas.scss'],
})
export class FloorCanvasComponent implements AfterViewInit {
  protected readonly fps = inject(FloorPlanService);
  private readonly elRef = inject(ElementRef<HTMLElement>);

  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLElement>;

  private dragState: DragState | null = null;
  private isPanning = false;
  private panMoved  = false;
  private panStartX = 0;
  private panStartY = 0;
  private panOriginX = 0;
  private panOriginY = 0;

  // Pre-compute transform string for the scene
  readonly sceneTransform = computed(() => {
    const { x, y } = this.fps.pan();
    return `translate(${x}px, ${y}px) scale(${this.fps.zoom()})`;
  });

  readonly zoomPercent = computed(() => Math.round(this.fps.zoom() * 100) + '%');

  ngAfterViewInit(): void {
    // Passive:false needed for wheel to call preventDefault
    this.elRef.nativeElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  // ── Canvas interaction ─────────────────────────────────────────────────

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.hostRect();
    this.fps.applyZoom(
      e.deltaY < 0 ? 1.1 : 0.9,
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  }

  /** Called by toolbar zoom-in button */
  zoomIn(): void {
    const { width, height } = this.hostRect();
    this.fps.applyZoom(1.25, width / 2, height / 2);
  }

  /** Called by toolbar zoom-out button */
  zoomOut(): void {
    const { width, height } = this.hostRect();
    this.fps.applyZoom(0.8, width / 2, height / 2);
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('app-room-marker, app-station-marker')) return;
    this.isPanning = true;
    this.panMoved  = false;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    const { x, y } = this.fps.pan();
    this.panOriginX = x;
    this.panOriginY = y;
    this.elRef.nativeElement.style.cursor = 'grabbing';
    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    // ── Panning ──
    if (this.isPanning) {
      const dx = e.clientX - this.panStartX;
      const dy = e.clientY - this.panStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.panMoved = true;
      if (this.panMoved) this.fps.setPan(this.panOriginX + dx, this.panOriginY + dy);
      return;
    }
    // ── Marker dragging ──
    if (!this.dragState) return;
    const zoom = this.fps.zoom();
    const host = this.elRef.nativeElement;
    const dx = (e.clientX - this.dragState.startMouseX) / zoom / host.offsetWidth  * 100;
    const dy = (e.clientY - this.dragState.startMouseY) / zoom / host.offsetHeight * 100;
    const xPct = clamp(this.dragState.startXPct + dx);
    const yPct = clamp(this.dragState.startYPct + dy);
    if (this.dragState.type === 'room') {
      this.fps.updateRoom(this.dragState.id, { xPct, yPct });
    } else {
      this.fps.updateStation(this.dragState.id, { xPct, yPct });
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isPanning = false;
    this.dragState = null;
    const mode = this.fps.mode();
    this.elRef.nativeElement.style.cursor = mode !== 'view' ? 'crosshair' : 'grab';
  }

  @HostListener('click', ['$event'])
  onClick(e: MouseEvent): void {
    if (this.panMoved || !this.fps.image()) return;
    const target = e.target as HTMLElement;
    if (target.closest('app-room-marker, app-station-marker')) return;

    const { x: px, y: py } = this.toScenePct(e.clientX, e.clientY);
    const mode = this.fps.mode();

    if (mode === 'placing-room') {
      this.fps.addRoom(px, py);
    } else if (mode === 'placing-station') {
      const roomId = this.fps.pendingRoomId();
      if (roomId) {
        this.fps.addStation(px, py, roomId);
        this.fps.setMode('view');
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.fps.setMode('view');
  }

  // ── File input / drop ─────────────────────────────────────────────────
 
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.fps.loadImage(file);
  }
 
  onDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files?.[0];
    if (file) this.fps.loadImage(file);
  }

  // ── Marker events ──────────────────────────────────────────────────────

  onRoomDragStart(event: MarkerDragStart): void {
    const room = this.fps.rooms().find(r => r.id === event.id);
    if (!room) return;
    this.dragState = {
      type: 'room', id: event.id,
      startMouseX: event.mouseX, startMouseY: event.mouseY,
      startXPct: room.xPct, startYPct: room.yPct,
    };
  }

  onStationDragStart(event: MarkerDragStart): void {
    const station = this.fps.stations().find(s => s.id === event.id);
    if (!station) return;
    this.dragState = {
      type: 'station', id: event.id,
      startMouseX: event.mouseX, startMouseY: event.mouseY,
      startXPct: station.xPct, startYPct: station.yPct,
    };
  }

  onAddStation(roomId: string): void {
    this.fps.setMode('placing-station', roomId);
    this.elRef.nativeElement.style.cursor = 'crosshair';
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private hostRect() { return this.elRef.nativeElement.getBoundingClientRect(); }

  private toScenePct(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.hostRect();
    const { x: panX, y: panY } = this.fps.pan();
    const zoom = this.fps.zoom();
    const host = this.elRef.nativeElement;
    return {
      x: ((clientX - rect.left - panX) / zoom / host.offsetWidth)  * 100,
      y: ((clientY - rect.top  - panY) / zoom / host.offsetHeight) * 100,
    };
  }
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}
