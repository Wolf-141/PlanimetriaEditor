import {
  Component, Input, Output, EventEmitter,
  HostBinding, HostListener,
} from '@angular/core';
import { Room } from '../models/floor-plan';

export interface MarkerDragStart {
  id: string;
  mouseX: number;
  mouseY: number;
}

@Component({
  selector: 'app-room-marker',
  standalone: true,
  template: `
    <span
      class="label"
      contenteditable="true"
      spellcheck="false"
      (mousedown)="$event.stopPropagation()"
      (keydown)="onKeyDown($event)"
      (blur)="onLabelBlur($event)">{{ room.label }}</span>

    <button
      class="plus-btn"
      title="Add station to this room"
      (mousedown)="$event.stopPropagation()"
      (click)="$event.stopPropagation(); addStation.emit(room.id)">+</button>

    <button
      class="del-btn"
      title="Delete room"
      (mousedown)="$event.stopPropagation()"
      (click)="$event.stopPropagation(); delete.emit(room.id)">✕</button>
  `,
  styles: [`
    :host {
      position: absolute;
      transform: translate(-50%, -50%) scale(var(--marker-scale, 1));
      background: #185FA5;
      color: #E6F1FB;
      border: 2px solid #0C447C;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 500;
      cursor: move;
      user-select: none;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 5px;
      z-index: 10;
    }

    .label {
      outline: none;
      background: transparent;
      border: none;
      color: inherit;
      font: inherit;
      min-width: 36px;
      cursor: text;
    }

    .plus-btn {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.35);
      color: #E6F1FB;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      line-height: 1;
      font-weight: 300;
    }
    .plus-btn:hover { background: rgba(255, 255, 255, 0.4); }

    .del-btn {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.2);
      border: none;
      color: #E6F1FB;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }
    .del-btn:hover { background: #A32D2D; color: #FCEBEB; }
  `],
})
export class RoomMarkerComponent {
  @Input({ required: true }) room!: Room;
  @Input() zoom = 1;

  @Output() dragStart   = new EventEmitter<MarkerDragStart>();
  @Output() addStation  = new EventEmitter<string>();  // roomId
  @Output() delete      = new EventEmitter<string>();  // roomId
  @Output() labelChange = new EventEmitter<{ id: string; label: string }>();

  @HostBinding('style.left') get left() { return this.room.xPct + '%'; }
  @HostBinding('style.top')  get top()  { return this.room.yPct + '%'; }
  @HostBinding('style.--marker-scale') get markerScale() { return 1 / this.zoom; }

  @HostListener('mousedown', ['$event'])
  onHostMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('.label, .plus-btn, .del-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragStart.emit({ id: this.room.id, mouseX: e.clientX, mouseY: e.clientY });
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); }
  }

  onLabelBlur(e: FocusEvent): void {
    const text = (e.target as HTMLElement).textContent?.trim() ?? '';
    if (text && text !== this.room.label) {
      this.labelChange.emit({ id: this.room.id, label: text });
    }
  }
}
