import { Component, ViewChild, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloorPlanService } from '../services/floor-plan';
import { FloorCanvasComponent } from '../floor-canvas/floor-canvas';

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
  readonly hasImage    = computed(() => !!this.fps.image());
  readonly roomCount   = computed(() => this.fps.rooms().length);
  readonly stationCount = computed(() => this.fps.stations().length);
  readonly isPlacingRoom = computed(() => this.fps.mode() === 'placing-room');

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
}
