import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostBinding,
  HostListener,
} from '@angular/core';
import { Station } from '../models/floor-plan';
import { MarkerDragStart } from '../markers/room-marker';

@Component({
  selector: 'app-station-marker',
  standalone: true,
  template: `
    <div class="dot"></div>

    <div class="meta">
      <span
        class="label"
        contenteditable="true"
        spellcheck="false"
        (mousedown)="$event.stopPropagation()"
        (keydown)="onKeyDown($event)"
        (blur)="onLabelBlur($event)">{{ station.label }}</span>

      @if (roomLabel) {
        <span class="room-label">{{ roomLabel }}</span>
      }
    </div>

    <button
      class="del-btn"
      title="Delete station"
      (mousedown)="$event.stopPropagation()"
      (click)="$event.stopPropagation(); delete.emit(station.id)">x</button>
  `,
  styles: [
    `
      :host {
        position: absolute;
        transform: translate(-50%, -50%);
        background: #085041;
        color: #9fe1cb;
        border: 1.5px solid #0f6e56;
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 500;
        cursor: move;
        user-select: none;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 5px;
        z-index: 9;
      }

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #5dcaa5;
        flex-shrink: 0;
      }

      .label {
        outline: none;
        background: transparent;
        border: none;
        color: inherit;
        font: inherit;
        min-width: 10px;
        cursor: text;
      }

      .meta {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .room-label {
        font-size: 10px;
        line-height: 1;
        color: #dff7ee;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 999px;
        padding: 2px 6px;
      }

      .del-btn {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.25);
        border: none;
        color: #9fe1cb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
      }

      .del-btn:hover {
        background: #a32d2d;
        color: #fcebeb;
      }
    `,
  ],
})
export class StationMarkerComponent {
  @Input({ required: true }) station!: Station;
  @Input() roomLabel = '';
  //@Input() zoom = 1;

  @Output() dragStart = new EventEmitter<MarkerDragStart>();
  @Output() delete = new EventEmitter<string>();
  @Output() labelChange = new EventEmitter<{ id: string; label: string }>();

  /*
  @HostBinding('style.left')
  get left() {
    return this.station.xPct + '%';
  }

  @HostBinding('style.top')
  get top() {
    return this.station.yPct + '%';
  }

  @HostBinding('style.--marker-scale')
  get markerScale() {
    return 1 / this.zoom;
  }
  */

  @HostListener('mousedown', ['$event'])
  onHostMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('.label, .del-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragStart.emit({ id: this.station.id, mouseX: e.clientX, mouseY: e.clientY });
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  }

  onLabelBlur(e: FocusEvent): void {
    const text = (e.target as HTMLElement).textContent?.trim() ?? '';
    if (text && text !== this.station.label) {
      this.labelChange.emit({ id: this.station.id, label: text });
    }
  }
}
