/**
 * Minimal TypeScript declarations for the `dxf` npm package.
 * The package ships no bundled types and there are no community @types.
 */
declare module 'dxf' {
  /** AutoCAD Color Index (ACI) lookup table: index → [R, G, B]. */
  export const colors: Record<number, [number, number, number]>;

  export class Helper {
    constructor(dxfString: string);

    /** Raw parsed structure. */
    readonly parsed: {
      entities: DxfEntity[];
      tables?: {
        layers?: Record<string, { colorNumber: number }>;
      };
    };

    /** Entities with block references flattened (transforms applied). */
    readonly denormalised: DxfEntity[];

    /** Returns a complete SVG string representing the DXF drawing. */
    toSVG(): string;
  }

  export interface DxfEntity {
    type: string;
    layer?: string;
    colorNumber?: number;
    transforms?: unknown[];
    // TEXT
    string?: string;
    x?: number;
    y?: number;
    textHeight?: number;
    hAlign?: number; // 0=left 1=center 2=right
    // MTEXT
    nominalTextHeight?: number;
    // …other entity fields omitted
    [key: string]: unknown;
  }
}