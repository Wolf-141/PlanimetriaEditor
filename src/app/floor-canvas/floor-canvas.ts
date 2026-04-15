import {
  Component,
  ElementRef,
  HostListener,
  inject,
  ViewChild,
  AfterViewInit,
  effect,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloorPlanService } from '../services/floor-plan';
import { RoomMarkerComponent, MarkerDragStart } from '../markers/room-marker';
import { StationMarkerComponent } from '../markers/station-marker';

interface DragState {
  type: 'room' | 'meeting' | 'station';
  id: string;
  startMouseX: number;
  startMouseY: number;
  startXPct: number;
  startYPct: number;
}

interface ImageFrame {
  left: number;
  top: number;
  width: number;
  height: number;
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
  private readonly ngZone = inject(NgZone);

  @ViewChild('sceneEl') sceneEl!: ElementRef<HTMLElement>;
  @ViewChild('markersOverlayEl') private markersOverlayEl?: ElementRef<HTMLElement>;

  protected imageFrame: ImageFrame = { left: 0, top: 0, width: 0, height: 0 };

  private dragState: DragState | null = null;

  // Panning state (kept outside Angular zone for zero-overhead mousemove)
  private isPanning = false;
  private panMoved = false;
  private panStartX = 0;
  private panStartY = 0;
  private panOriginX = 0;
  private panOriginY = 0;
  /** Pending pan values to commit to the signal on mouseup. */
  private pendingPan: { x: number; y: number } | null = null;

  // Zoom state — RAF-throttled to coalesce rapid wheel events into one signal update
  private pendingZoomFactor = 1;
  private pendingZoomFocalX = 0;
  private pendingZoomFocalY = 0;
  private zoomRafId: number | null = null;

  constructor() {
    effect(() => {
      const { x, y } = this.fps.pan();
      this.fps.zoom(); // traccia dipendenza: re-run quando lo zoom cambia (le dimensioni fisiche sono nel template)
      this.writeTransform(x, y);
    });

    effect(() => {
      this.fps.image();
      this.updateImageFrame();
    });
  }

  ngAfterViewInit(): void {
    this.elRef.nativeElement.addEventListener('wheel', this.onWheel.bind(this), {
      passive: false,
    });

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onMouseMoveOutside.bind(this));
      document.addEventListener('mouseup', this.onMouseUpOutside.bind(this));
    });

    this.updateImageFrame();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateImageFrame();
  }

  // Canvas interaction
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.hostRect();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const focalX = e.clientX - rect.left;
    const focalY = e.clientY - rect.top;

    // Accumulate factors so that bursts of wheel events are collapsed into a
    // single applyZoom() call per animation frame — no change-detection churn
    // during fast scrolling.
    this.pendingZoomFactor *= factor;
    this.pendingZoomFocalX = focalX;
    this.pendingZoomFocalY = focalY;

    if (this.zoomRafId === null) {
      this.zoomRafId = requestAnimationFrame(() => {
        this.zoomRafId = null;
        const f = this.pendingZoomFactor;
        const fx = this.pendingZoomFocalX;
        const fy = this.pendingZoomFocalY;
        this.pendingZoomFactor = 1; // reset accumulator
        this.ngZone.run(() => this.fps.applyZoom(f, fx, fy));
      });
    }
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

  toScreenX(xPct: number): number {
    const { x: panX } = this.fps.pan();
    const zoom = this.fps.zoom();
    const { left, width } = this.imageFrame;
    return panX + zoom * (left + (xPct / 100) * width);
  }

  toScreenY(yPct: number): number {
    const { y: panY } = this.fps.pan();
    const zoom = this.fps.zoom();
    const { top, height } = this.imageFrame;
    return panY + zoom * (top + (yPct / 100) * height);
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('app-room-marker, app-station-marker')) return;
    this.isPanning = true;
    this.panMoved = false;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    const { x, y } = this.fps.pan();
    this.panOriginX = x;
    this.panOriginY = y;
    this.pendingPan = null;
    this.elRef.nativeElement.style.cursor = 'grabbing';
    e.preventDefault();
  }

  /**
   * Runs outside Angular zone - no change detection cost.
   * Only writes directly to the DOM during pan; marker drag re-enters the zone.
   */
  private onMouseMoveOutside(e: MouseEvent): void {
    if (this.isPanning) {
      const dx = e.clientX - this.panStartX;
      const dy = e.clientY - this.panStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.panMoved = true;
      if (this.panMoved) {
        const x = this.panOriginX + dx;
        const y = this.panOriginY + dy;
        this.writeTransform(x, y);
        this.pendingPan = { x, y };
        // Fix 1: sposta l'overlay dei marker in sync con la scena, senza rientrare nella zone Angular
        const overlayEl = this.markersOverlayEl?.nativeElement;
        if (overlayEl) overlayEl.style.transform = `translate(${dx}px, ${dy}px)`;
      }
      return;
    }

    if (!this.dragState) return;
    this.ngZone.run(() => {
      if (!this.dragState) return;
      const zoom = this.fps.zoom();
      const { width, height } = this.imageFrame;
      if (!width || !height) return;
      const dx = ((e.clientX - this.dragState.startMouseX) / zoom / width) * 100;
      const dy = ((e.clientY - this.dragState.startMouseY) / zoom / height) * 100;
      const xPct = clamp(this.dragState.startXPct + dx);
      const yPct = clamp(this.dragState.startYPct + dy);
      if (this.dragState.type === 'room') {
        this.fps.updateRoom(this.dragState.id, { xPct, yPct });
      } else if (this.dragState.type === 'meeting') {
        this.fps.updateMeeting(this.dragState.id, { xPct, yPct });
      } else {
        this.fps.updateStation(this.dragState.id, { xPct, yPct });
      }
    });
  }

  /** Runs outside Angular zone - commits pending pan to signal on release. */
  private onMouseUpOutside(): void {
    const wasPanning = this.isPanning;
    this.isPanning = false;
    this.dragState = null;

    if (wasPanning && this.pendingPan) {
      const { x, y } = this.pendingPan;
      this.pendingPan = null;
      // Fix 1: azzera il translate temporaneo PRIMA che Angular ricalcoli le posizioni assolute
      const overlayEl = this.markersOverlayEl?.nativeElement;
      if (overlayEl) overlayEl.style.transform = '';
      this.ngZone.run(() => this.fps.setPan(x, y));
    }

    const mode = this.fps.mode();
    this.elRef.nativeElement.style.cursor = mode === 'view' ? 'grab' : 'crosshair';
  }

  @HostListener('click', ['$event'])
  onClick(e: MouseEvent): void {
    if (this.panMoved || !this.fps.image()) return;
    const target = e.target as HTMLElement;
    if (target.closest('app-room-marker, app-station-marker')) return;

    const point = this.toImagePct(e.clientX, e.clientY);
    if (!point) return;
    const mode = this.fps.mode();

    if (mode === 'placing-room') {
      this.fps.addRoom(point.x, point.y);
    } else if (mode === 'placing-meeting') {
      this.fps.addMeeting(point.x, point.y);
    } else if (mode === 'placing-station') {
      const roomId = this.fps.pendingRoomId();
      if (roomId) {
        this.fps.addStation(point.x, point.y, roomId);
        // Resta in placing-station per lo stesso roomId: l'utente può continuare
        // ad aggiungere postazioni senza dover ri-cliccare su "+".
        // Si esce con Esc (onEscape) o cliccando un altro tool.
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.fps.setMode('view');
  }

  // File input / drop
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.fps.loadImage(file);
  }

  onDrop(event: DragEvent): void {
    const file = event.dataTransfer?.files?.[0];
    if (file) this.fps.loadImage(file);
  }

  // Marker events
  onRoomDragStart(event: MarkerDragStart): void {
    const room = this.fps.rooms().find((r) => r.id === event.id);
    if (!room) return;
    this.dragState = {
      type: 'room',
      id: event.id,
      startMouseX: event.mouseX,
      startMouseY: event.mouseY,
      startXPct: room.xPct,
      startYPct: room.yPct,
    };
  }

  onMeetingDragStart(event: MarkerDragStart): void {
    const meeting = this.fps.meetings().find((m) => m.id === event.id);
    if (!meeting) return;
    this.dragState = {
      type: 'meeting',
      id: event.id,
      startMouseX: event.mouseX,
      startMouseY: event.mouseY,
      startXPct: meeting.xPct,
      startYPct: meeting.yPct,
    };
  }

  onStationDragStart(event: MarkerDragStart): void {
    const station = this.fps.stations().find((s) => s.id === event.id);
    if (!station) return;
    this.dragState = {
      type: 'station',
      id: event.id,
      startMouseX: event.mouseX,
      startMouseY: event.mouseY,
      startXPct: station.xPct,
      startYPct: station.yPct,
    };
  }

  onAddStation(roomId: string): void {
    this.fps.setMode('placing-station', roomId);
    this.elRef.nativeElement.style.cursor = 'crosshair';
  }

  // Helpers
  private writeTransform(x: number, y: number): void {
    const el = this.sceneEl?.nativeElement;
    if (el) el.style.transform = `translate(${x}px, ${y}px)`;
  }

  private hostRect() {
    return this.elRef.nativeElement.getBoundingClientRect();
  }

  private updateImageFrame(): void {
    const image = this.fps.image();
    const host = this.elRef.nativeElement;
    const hostWidth = host.clientWidth;
    const hostHeight = host.clientHeight;

    if (!image || !hostWidth || !hostHeight || !image.naturalWidth || !image.naturalHeight) {
      this.imageFrame = { left: 0, top: 0, width: 0, height: 0 };
      return;
    }

    const scale = Math.min(hostWidth / image.naturalWidth, hostHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    this.imageFrame = {
      left: (hostWidth - width) / 2,
      top: (hostHeight - height) / 2,
      width,
      height,
    };
  }

  private toImagePct(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.hostRect();
    const { x: panX, y: panY } = this.fps.pan();
    const zoom = this.fps.zoom();
    const { left, top, width, height } = this.imageFrame;
    if (!width || !height) return null;

    const sceneX = (clientX - rect.left - panX) / zoom;
    const sceneY = (clientY - rect.top - panY) / zoom;
    const xPct = ((sceneX - left) / width) * 100;
    const yPct = ((sceneY - top) / height) * 100;

    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return null;

    return {
      x: xPct,
      y: yPct,
    };
  }
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}