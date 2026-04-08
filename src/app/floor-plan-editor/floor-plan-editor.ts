import { Component, ViewChild, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloorPlanService } from '../services/floor-plan';
import { FloorCanvasComponent } from '../floor-canvas/floor-canvas';
import { FloorPlanExport } from '../models/floor-plan';

@Component({
  selector: 'app-floor-plan-editor',
  standalone: true,
  imports: [CommonModule, FloorCanvasComponent],
  templateUrl: './floor-plan-editor.html',
  styleUrls: ['./floor-plan-editor.scss'],
})
export class FloorPlanEditorComponent {
  protected readonly fps = inject(FloorPlanService);

  @ViewChild(FloorCanvasComponent) private canvas!: FloorCanvasComponent;

  readonly zoomPercent   = computed(() => Math.round(this.fps.zoom() * 100) + '%');
  readonly hasImage      = computed(() => !!this.fps.image());
  readonly roomCount     = computed(() => this.fps.rooms().length);
  readonly stationCount  = computed(() => this.fps.stations().length);
  readonly isPlacingRoom = computed(() => this.fps.mode() === 'placing-room');

  /** Non-null when the import error modal should be shown. */
  readonly importError = signal<string | null>(null);

  readonly hint = computed(() => {
    switch (this.fps.mode()) {
      case 'placing-room':    return 'Click the floor plan to place a room · Esc to cancel';
      case 'placing-station': return 'Click the floor plan to place the station · Esc to cancel';
      default: return 'Drag to reposition · Click label to rename · Use + on a room to add a station · Scroll to zoom';
    }
  });

  // ── Toolbar actions ────────────────────────────────────────────────────

  toggleRoomMode(): void {
    this.fps.setMode(this.fps.mode() === 'placing-room' ? 'view' : 'placing-room');
  }

  zoomIn():    void { this.canvas.zoomIn(); }
  zoomOut():   void { this.canvas.zoomOut(); }
  resetView(): void { this.fps.resetView(); }
  clearAll():  void { this.fps.clearAll(); }

  exportJSON(): void {
    const data = this.fps.buildExport();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'floor-plan.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Import JSON ────────────────────────────────────────────────────────

  importJSON(file: File | undefined): void {
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => this.showImportError('Could not read the file.');
    reader.onload  = (e) => {
      let parsed: unknown;

      // 1. Parse JSON
      try {
        parsed = JSON.parse(e.target?.result as string);
      } catch {
        this.showImportError('The file is not valid JSON.');
        return;
      }

      // 2. Structural validation
      const err = this.validateExport(parsed);
      if (err) {
        this.showImportError(err);
        return;
      }

      // 3. Apply to service
      const data = parsed as FloorPlanExport;
      this.fps.importFromExport(data);
    };

    reader.readAsText(file);
  }

  private showImportError(msg: string): void {
    this.importError.set(msg);
  }

  /**
   * Returns an error string if `data` is not a valid FloorPlanExport,
   * or null if it passes all checks.
   */
  private validateExport(data: unknown): string | null {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return 'The JSON must be an object.';
    }

    const d = data as Record<string, unknown>;

    // image block
    if (typeof d['image'] !== 'object' || d['image'] === null) {
      return 'Missing or invalid "image" block.';
    }
    const img = d['image'] as Record<string, unknown>;
    if (typeof img['filename'] !== 'string') {
      return 'Missing "image.filename".';
    }
    if (typeof img['naturalWidth'] !== 'number' || typeof img['naturalHeight'] !== 'number') {
      return 'Missing or invalid "image.naturalWidth" / "image.naturalHeight".';
    }

    // rooms
    if (!Array.isArray(d['rooms'])) {
      return 'Missing or invalid "rooms" array.';
    }
    for (let i = 0; i < (d['rooms'] as unknown[]).length; i++) {
      const r = (d['rooms'] as unknown[])[i] as Record<string, unknown>;
      if (typeof r['id'] !== 'string')    return `rooms[${i}]: missing "id".`;
      if (typeof r['label'] !== 'string') return `rooms[${i}]: missing "label".`;
      const pos = r['position'] as Record<string, unknown>;
      if (!pos || typeof pos['xPct'] !== 'number' || typeof pos['yPct'] !== 'number') {
        return `rooms[${i}]: missing or invalid "position".`;
      }
    }

    // stations
    if (!Array.isArray(d['stations'])) {
      return 'Missing or invalid "stations" array.';
    }
    for (let i = 0; i < (d['stations'] as unknown[]).length; i++) {
      const s = (d['stations'] as unknown[])[i] as Record<string, unknown>;
      if (typeof s['id'] !== 'string')     return `stations[${i}]: missing "id".`;
      if (typeof s['label'] !== 'string')  return `stations[${i}]: missing "label".`;
      if (typeof s['roomId'] !== 'string') return `stations[${i}]: missing "roomId".`;
      const pos = s['position'] as Record<string, unknown>;
      if (!pos || typeof pos['xPct'] !== 'number' || typeof pos['yPct'] !== 'number') {
        return `stations[${i}]: missing or invalid "position".`;
      }
    }

    // cross-reference: every station.roomId must exist in rooms
    const roomIds = new Set((d['rooms'] as Array<Record<string, unknown>>).map(r => r['id']));
    for (const s of (d['stations'] as Array<Record<string, unknown>>)) {
      if (!roomIds.has(s['roomId'])) {
        return `Station "${s['id']}" references unknown roomId "${s['roomId']}".`;
      }
    }

    return null;
  }
}