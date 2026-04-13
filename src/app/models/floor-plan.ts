export interface Room {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
}

export interface Meeting {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
}

export interface Station {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
  roomId: string;
}

export interface ImageMeta {
  filename: string;
  naturalWidth: number;
  naturalHeight: number;
  dataUrl: string;
}

export type EditorMode = 'view' | 'placing-room' | 'placing-meeting' | 'placing-station';

/** Shape of the exported JSON file */
export interface FloorPlanExport {
  exportedAt: string;
  image: Omit<ImageMeta, 'dataUrl'>;
  meetings: Array<{
    id: string;
    label: string;
    position: { xPct: number; yPct: number };
  }>;
  rooms: Array<{
    id: string;
    label: string;
    position: { xPct: number; yPct: number };
    stations: Array<{
      id: string;
      label: string;
      position: { xPct: number; yPct: number };
    }>;
  }>;
}