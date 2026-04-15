import { Component, ViewChild, inject, computed, signal, effect } from '@angular/core';
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

  readonly zoomPercent = computed(() => Math.round(this.fps.zoom() * 100) + '%');
  readonly hasImage = computed(() => !!this.fps.image());
  readonly roomCount = computed(() => this.fps.rooms().length);
  readonly meetingCount = computed(() => this.fps.meetings().length);
  readonly stationCount = computed(() => this.fps.stations().length);
  readonly isPlacingRoom = computed(() => this.fps.mode() === 'placing-room');
  readonly isPlacingMeeting = computed(() => this.fps.mode() === 'placing-meeting');
  readonly importError = signal<string | null>(null);
  readonly confirmClear = signal(false);
  readonly imageWarning = signal<{ message: string; data: FloorPlanExport } | null>(null);

  constructor() {
    // Propagate DXF/file-load errors to the shared error modal.
    // importError is already wired to the modal, so we reuse it here.
    effect(() => {
      const err = this.fps.loadError();
      if (err) this.importError.set(err);
    });
  }

  readonly hint = computed(() => {
    switch (this.fps.mode()) {
      case 'placing-room':
        return 'Click the floor plan to place a room - Esc to cancel';
      case 'placing-meeting':
        return 'Click the floor plan to place a meeting room - Esc to cancel';
      case 'placing-station':
        return 'Click the floor plan to place the station - Esc to cancel';
      default:
        return 'Drag to reposition - Click label to rename - Use + on a room to add a station - Scroll to zoom';
    }
  });

  // Toolbar actions
  toggleRoomMode(): void {
    this.fps.setMode(this.fps.mode() === 'placing-room' ? 'view' : 'placing-room');
  }

  toggleMeetingMode(): void {
    this.fps.setMode(this.fps.mode() === 'placing-meeting' ? 'view' : 'placing-meeting');
  }

  zoomIn(): void {
    this.canvas.zoomIn();
  }

  zoomOut(): void {
    this.canvas.zoomOut();
  }

  resetView(): void {
    this.fps.resetView();
  }

  openClearConfirmation(): void {
    this.confirmClear.set(true);
  }

  cancelClear(): void {
    this.confirmClear.set(false);
  }

  clearAll(): void {
    this.confirmClear.set(false);
    this.fps.clearAll();
  }

  exportJSON(): void {
    const data = this.fps.buildExport();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const imageName = data.image.filename.substring(0, data.image.filename.lastIndexOf("."));
    a.href = url;
    a.download = `${imageName}-floor-plan.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import JSON
  importJSON(file: File | undefined): void {
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => this.showImportError('Could not read the file.');
    reader.onload = (e) => {
      let parsed: unknown;

      try {
        parsed = JSON.parse(e.target?.result as string);
      } catch {
        this.showImportError('The file is not valid JSON.');
        return;
      }

      const err = this.validateExport(parsed);
      if (err) {
        this.showImportError(err);
        return;
      }

      const data = parsed as FloorPlanExport;

      // Check if the loaded image matches the one in the JSON
      const currentImg = this.fps.image();
      if (currentImg) {
        const jsonImg = data.image;
        const nameMismatch = jsonImg.filename !== currentImg.filename;
        const sizeMismatch =
          jsonImg.naturalWidth !== currentImg.naturalWidth ||
          jsonImg.naturalHeight !== currentImg.naturalHeight;

        if (nameMismatch || sizeMismatch) {
          const details: string[] = [];
          if (nameMismatch)
            details.push(`filename: "${currentImg.filename}" vs "${jsonImg.filename}"`);
          if (sizeMismatch)
            details.push(
              `dimensions: ${currentImg.naturalWidth}×${currentImg.naturalHeight} vs ${jsonImg.naturalWidth}×${jsonImg.naturalHeight}`,
            );
          this.imageWarning.set({
            message: `The JSON was created with a different image (${details.join(', ')}). Marker positions may not align correctly.`,
            data,
          });
          return;
        }
      }

      this.fps.importFromExport(data);
    };

    reader.readAsText(file);
  }

  private showImportError(msg: string): void {
    this.importError.set(msg);
  }

  confirmImageWarning(): void {
    const pending = this.imageWarning();
    if (pending) {
      this.imageWarning.set(null);
      this.fps.importFromExport(pending.data);
    }
  }

  cancelImageWarning(): void {
    this.imageWarning.set(null);
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

    if (!Array.isArray(d['meetings'])) {
      return 'Missing or invalid "meetings" array.';
    }
    for (let i = 0; i < (d['meetings'] as unknown[]).length; i++) {
      const m = (d['meetings'] as unknown[])[i] as Record<string, unknown>;
      if (typeof m['id'] !== 'string') return `meetings[${i}]: missing "id".`;
      if (typeof m['label'] !== 'string') return `meetings[${i}]: missing "label".`;
      const pos = m['position'] as Record<string, unknown>;
      if (!pos || typeof pos['xPct'] !== 'number' || typeof pos['yPct'] !== 'number') {
        return `meetings[${i}]: missing or invalid "position".`;
      }
    }

    if (!Array.isArray(d['rooms'])) {
      return 'Missing or invalid "rooms" array.';
    }
    for (let i = 0; i < (d['rooms'] as unknown[]).length; i++) {
      const r = (d['rooms'] as unknown[])[i] as Record<string, unknown>;
      if (typeof r['id'] !== 'string') return `rooms[${i}]: missing "id".`;
      if (typeof r['label'] !== 'string') return `rooms[${i}]: missing "label".`;
      const pos = r['position'] as Record<string, unknown>;
      if (!pos || typeof pos['xPct'] !== 'number' || typeof pos['yPct'] !== 'number') {
        return `rooms[${i}]: missing or invalid "position".`;
      }
      if (!Array.isArray(r['stations'])) {
        return `rooms[${i}]: missing or invalid "stations" array.`;
      }
      for (let j = 0; j < (r['stations'] as unknown[]).length; j++) {
        const s = (r['stations'] as unknown[])[j] as Record<string, unknown>;
        if (typeof s['id'] !== 'string') return `rooms[${i}].stations[${j}]: missing "id".`;
        if (typeof s['label'] !== 'string') return `rooms[${i}].stations[${j}]: missing "label".`;
        const sPos = s['position'] as Record<string, unknown>;
        if (!sPos || typeof sPos['xPct'] !== 'number' || typeof sPos['yPct'] !== 'number') {
          return `rooms[${i}].stations[${j}]: missing or invalid "position".`;
        }
      }
    }

    return null;
  }
}