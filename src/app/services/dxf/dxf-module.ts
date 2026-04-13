/**
 * Minimal TypeScript declarations for the `dxf` npm package.
 * The package ships no bundled types and there are no community @types.
 */
declare module 'dxf' {
  export class Helper {
    constructor(dxfString: string);
    /** Returns a complete SVG string representing the DXF drawing. */
    toSVG(): string;
  }
}