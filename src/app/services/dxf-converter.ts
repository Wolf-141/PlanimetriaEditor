import { Injectable } from '@angular/core';
import { Helper } from 'dxf';

export interface DxfConversionResult {
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
}

@Injectable({ providedIn: 'root' })
export class DxfConverterService {
  /**
   * Converts a DXF text string to an SVG data URL.
   *
   * The `dxf` library emits `width="100%" height="100%"` on the root <svg>
   * element, which prevents the browser from reporting meaningful
   * naturalWidth/naturalHeight values when the SVG is loaded into an <img>.
   * We replace those attributes with explicit pixel values derived from the
   * viewBox so the rest of the app can treat the result like any raster image.
   *
   * @throws if the DXF cannot be parsed or produces no drawable content.
   */
  convert(dxfText: string): DxfConversionResult {
    const helper = new Helper(dxfText);
    let svgString = helper.toSVG();

    if (!svgString?.trim()) {
      throw new Error('The DXF file produced no drawable content.');
    }

    // viewBox="minX minY width height"  (width and height are always positive)
    const vbMatch = svgString.match(/viewBox="([^"]+)"/);
    let naturalWidth = 1000;
    let naturalHeight = 1000;

    if (vbMatch) {
      const parts = vbMatch[1].trim().split(/\s+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        naturalWidth = Math.round(parts[2]);
        naturalHeight = Math.round(parts[3]);
      }
    }

    // Patch explicit pixel dimensions so <img> reports the correct
    // naturalWidth / naturalHeight when this data URL is its src.
    svgString = svgString
      .replace(/width="[^"]*"/, `width="${naturalWidth}"`)
      .replace(/height="[^"]*"/, `height="${naturalHeight}"`);

    // encodeURIComponent handles Unicode characters that may appear in DXF
    // TEXT/MTEXT entities, avoiding btoa encoding issues.
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    return { dataUrl, naturalWidth, naturalHeight };
  }
}