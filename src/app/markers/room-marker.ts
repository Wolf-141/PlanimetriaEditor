import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostBinding,
  HostListener,
} from '@angular/core';
import { Meeting, Room } from '../models/floor-plan';

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
      (blur)="onLabelBlur($event)">{{ marker.label }}</span>

    @if (showAddStation) {
      <button
        class="plus-btn"
        title="Add station to this room"
        (mousedown)="$event.stopPropagation()"
        (click)="$event.stopPropagation(); addStation.emit(marker.id)">+</button>
    }

    <button
      class="del-btn"
      [title]="deleteTitle"
      (mousedown)="$event.stopPropagation()"
      (click)="$event.stopPropagation(); delete.emit(marker.id)">x</button>
  `,
  styles: [
    `
      :host {
        position: absolute;
        transform: translate(-50%, -50%);
        color: #e6f1fb;
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

      :host(.room) {
        background: #185fa5;
        border: 2px solid #0c447c;
      }

      :host(.meeting) {
        background: #9b5b00;
        border: 2px solid #7a4300;
        color: #fff1dc;
      }

      .label {
        outline: none;
        background: transparent;
        border: none;
        color: inherit;
        font: inherit;
        min-width: 20px;
        cursor: text;
      }

      .plus-btn {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.35);
        color: inherit;
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

      .plus-btn:hover {
        background: rgba(255, 255, 255, 0.4);
      }

      .del-btn {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.2);
        border: none;
        color: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
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
export class RoomMarkerComponent {
  @Input() room?: Room;
  @Input() meeting?: Meeting;
  //@Input() zoom = 1;
  @Input() showAddStation = true;
  @Input() variant: 'room' | 'meeting' = 'room';

  @Output() dragStart = new EventEmitter<MarkerDragStart>();
  @Output() addStation = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() labelChange = new EventEmitter<{ id: string; label: string }>();

  get marker(): Room | Meeting {
    return this.room ?? this.meeting!;
  }

  get deleteTitle(): string {
    return this.variant === 'meeting' ? 'Delete meeting room' : 'Delete room';
  }

  /*
  @HostBinding('style.left')
  get left() {
    return this.marker.xPct + '%';
  }

  @HostBinding('style.top')
  get top() {
    return this.marker.yPct + '%';
  }
  
  @HostBinding('style.--marker-scale')
  get markerScale() {
    return 1 / this.zoom;
  }
  */
  
  @HostBinding('class.room')
  get roomClass() {
    return this.variant === 'room';
  }

  @HostBinding('class.meeting')
  get meetingClass() {
    return this.variant === 'meeting';
  }

  @HostListener('mousedown', ['$event'])
  onHostMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('.label, .plus-btn, .del-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    this.dragStart.emit({ id: this.marker.id, mouseX: e.clientX, mouseY: e.clientY });
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  }

  onLabelBlur(e: FocusEvent): void {
    const text = (e.target as HTMLElement).textContent?.trim() ?? '';
    if (text && text !== this.marker.label) {
      this.labelChange.emit({ id: this.marker.id, label: text });
    }
  }
}
