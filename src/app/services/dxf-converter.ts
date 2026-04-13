import { Injectable } from '@angular/core';
import { Helper, colors, DxfEntity } from 'dxf';

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
   * The `dxf` library natively renders geometry (lines, polylines, arcs,
   * circles, splines) but silently drops TEXT and MTEXT entities. This
   * service re-reads those entities from `helper.denormalised` and injects
   * them as SVG <text> elements directly on the SVG root — outside the
   * main group that carries the Y-flip transform — so they appear upright
   * and with the correct fill colour.
   *
   * It also replaces the library's `width="100%" height="100%"` with
   * explicit pixel values derived from the viewBox, so downstream code can
   * read meaningful naturalWidth / naturalHeight from an <img>.
   *
   * @throws if the DXF cannot be parsed or produces no drawable content.
   */
  convert(dxfText: string): DxfConversionResult {
    const helper = new Helper(dxfText);
    let svgString = helper.toSVG();

    if (!svgString?.trim()) {
      throw new Error('The DXF file produced no drawable content.');
    }

    // ── viewBox → explicit pixel dimensions ──────────────────────────────
    // viewBox="minX minY width height"  (width/height always positive)
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

    svgString = svgString
      .replace(/width="[^"]*"/, `width="${naturalWidth}"`)
      .replace(/height="[^"]*"/, `height="${naturalHeight}"`);

    // ── Inject TEXT / MTEXT ───────────────────────────────────────────────
    const layers = helper.parsed?.tables?.layers ?? {};
    const textElements = helper.denormalised
      .filter((e) => e.type === 'TEXT' || e.type === 'MTEXT')
      .map((e) => this.entityToSvgText(e, layers))
      .filter((el): el is string => el !== null);

    if (textElements.length > 0) {
      svgString = svgString.replace('</svg>', textElements.join('\n') + '\n</svg>');
    }

    // ── Encode as data URL ────────────────────────────────────────────────
    // encodeURIComponent handles Unicode chars that may appear in DXF labels.
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    return { dataUrl, naturalWidth, naturalHeight };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Converts a single TEXT or MTEXT entity to an SVG <text> element string,
   * or returns null if the entity has no renderable content.
   *
   * Coordinate mapping: the library's root <g> applies matrix(1,0,0,-1,0,0)
   * to flip the DXF Y axis. Text placed inside that group would be upside-down
   * and invisible (the group also sets fill="none"). Placing <text> elements
   * outside the group with svgY = -dxfY gives correct upright rendering.
   */
  private entityToSvgText(
    e: DxfEntity,
    layers: Record<string, { colorNumber: number }>,
  ): string | null {
    const rawText = e.string ?? '';
    const text =
      e.type === 'MTEXT' ? this.stripMTextFormatting(rawText) : rawText.trim();
    if (!text) return null;

    const x = e.x ?? 0;
    const y = -(e.y ?? 0); // flip Y to match SVG coordinate system
    const fontSize = (e.textHeight ?? e.nominalTextHeight ?? 2.5).toFixed(4);
    const anchor = this.textAnchor(e.hAlign as number | undefined);
    const fill = this.resolveColor(e, layers);
    const escaped = this.escapeXml(text);

    return (
      `  <text` +
      ` x="${x}" y="${y}"` +
      ` font-size="${fontSize}"` +
      ` font-family="sans-serif"` +
      ` fill="${fill}"` +
      ` stroke="none"` +
      ` text-anchor="${anchor}"` +
      ` dominant-baseline="auto"` +
      `>${escaped}</text>`
    );
  }

  /**
   * Strips DXF MTEXT inline formatting codes and returns plain text.
   *
   * Handled codes:
   *   \P          → paragraph break (rendered as a space)
   *   \~          → non-breaking space
   *   {\fFont;…}  → font specification group
   *   {\Cn;…}     → color group
   *   \L \l       → underline on/off
   *   \O \o       → overline on/off
   *   %%c         → Ø (U+00D8)
   *   %%d         → ° (U+00B0)
   *   %%p         → ± (U+00B1)
   */
  private stripMTextFormatting(s: string): string {
    return s
      .replace(/\\P/g, ' ')                           // paragraph break
      .replace(/\\~/g, '\u00a0')                      // non-breaking space
      .replace(/\{\\[A-Za-z][^;]*;([^}]*)\}/g, '$1') // {\\Xparams;content} groups
      .replace(/[{}]/g, '')                           // stray braces
      .replace(/\\[A-Za-z]/g, '')                     // remaining escapes
      .replace(/%%c/gi, '\u00d8')                     // diameter Ø
      .replace(/%%d/gi, '\u00b0')                     // degree °
      .replace(/%%p/gi, '\u00b1')                     // plus-minus ±
      .trim();
  }

  /**
   * Maps DXF horizontal alignment code to SVG text-anchor value.
   * 0 = left (default), 1 = center, 2 = right.
   */
  private textAnchor(hAlign: number | undefined): string {
    if (hAlign === 1) return 'middle';
    if (hAlign === 2) return 'end';
    return 'start';
  }

  /**
   * Resolves the fill colour for a text entity.
   *
   * Priority: entity-level colorNumber → layer colorNumber → black fallback.
   * AutoCAD color 7 is "white-on-black / black-on-white" — we map it to
   * black (#000000) since floor plans are always displayed on a light background.
   */
  private resolveColor(
    e: DxfEntity,
    layers: Record<string, { colorNumber: number }>,
  ): string {
    // colorNumber 256 means "ByLayer"
    const entityColor =
      typeof e.colorNumber === 'number' && e.colorNumber !== 256
        ? e.colorNumber
        : null;

    const layerColor =
      e.layer && layers[e.layer] ? layers[e.layer].colorNumber : null;

    const colorIndex = entityColor ?? layerColor ?? 7;

    // Color 7 = black/white depending on background; use black for light BG
    if (colorIndex === 7) return '#000000';

    const rgb = colors[colorIndex];
    if (!rgb) return '#000000';
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }

  /** Escapes XML special characters for safe embedding in SVG text content. */
  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}