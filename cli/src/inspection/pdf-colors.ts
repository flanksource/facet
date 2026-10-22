import { loadPdfJs } from '../utils/pdfjs.js';
import type { ColorEntry, ColorInventory, ColorLocation } from './colors.js';

interface OperatorList { fnArray: number[]; argsArray: unknown[][] }
interface Objects { get(id: string, callback: (value: unknown) => void): unknown }
interface State { fill: unknown; stroke: unknown; text: number }

export async function inspectPdfColors(data: Uint8Array, positions: boolean): Promise<ColorInventory> {
  const { getDocument, OPS } = await loadPdfJs();
  const task = getDocument({ data: Uint8Array.from(data), stopAtErrors: true, verbosity: 0, useSystemFonts: false });
  const entries = new Map<string, ColorEntry>();
  const add = (value: string, location: ColorLocation): void => {
    if (value === 'transparent') return;
    const entry = entries.get(value) ?? { value, ...(positions ? { locations: [] } : {}) };
    if (entry.locations && !entry.locations.some(item => JSON.stringify(item) === JSON.stringify(location))) entry.locations.push(location);
    entries.set(value, entry);
  };
  try {
    const pdf = await task.promise;
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const list = await page.getOperatorList();
      const object = (id: string): Promise<unknown> => new Promise(resolve => (id.startsWith('g_') ? page.commonObjs : page.objs as Objects).get(id, resolve));
      const visit = async (list: OperatorList, initial?: State): Promise<void> => {
        let state: State = initial ? { ...initial } : { fill: '#000000', stroke: '#000000', text: 0 };
        const stack: State[] = [];
        const color = async (value: unknown, index: number): Promise<void> => {
          const location: ColorLocation = { type: 'pdf', page: number, ...(page.ref ? { object: `${page.ref.num} ${page.ref.gen} R` } : {}), operator: index };
          if (typeof value === 'string') { add(value, location); return; }
          if (!Array.isArray(value)) throw new Error(`Page ${number}: unsupported PDF color representation`);
          if (value[0] === 'TilingPattern') {
            if (Array.isArray(value[1]) && value[1].length === 3) add(`#${value[1].map((v: number) => v.toString(16).padStart(2, '0')).join('')}`, location);
            await visit(value[2] as OperatorList, state);
          } else if (value[0] === 'Shading') await color(await object(String(value[1])), index);
          else if (value[0] === 'RadialAxial') for (const stop of value[3] as [number, string][]) add(stop[1], location);
          else if (value[0] === 'Mesh') {
            const colors = value[3] as Uint8Array;
            for (let offset = 0; offset < colors.length; offset += 3) add(`#${[...colors.subarray(offset, offset + 3)].map(v => v.toString(16).padStart(2, '0')).join('')}`, location);
          } else throw new Error(`Page ${number}: unsupported PDF pattern ${String(value[0])}`);
        };
        const paint = async (op: number, index: number): Promise<void> => {
          if ([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke].includes(op)) await color(state.fill, index);
          if ([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke].includes(op)) await color(state.stroke, index);
        };
        for (let i = 0; i < list.fnArray.length; i++) {
          const op = list.fnArray[i];
          const args = list.argsArray[i];
          if (op === OPS.save || op === OPS.paintFormXObjectBegin) stack.push({ ...state });
          else if (op === OPS.restore || op === OPS.paintFormXObjectEnd) { const saved = stack.pop(); if (!saved) throw new Error(`Page ${number}: unbalanced graphics state`); state = saved; }
          else if (op === OPS.setFillRGBColor) state.fill = args[0];
          else if (op === OPS.setStrokeRGBColor) state.stroke = args[0];
          else if (op === OPS.setFillColorN) state.fill = args;
          else if (op === OPS.setStrokeColorN) state.stroke = args;
          else if (op === OPS.setTextRenderingMode) state.text = Number(args[0]);
          else if (op === OPS.constructPath) await paint(Number(args[0]), i);
          else if (op === OPS.shadingFill) await color(await object(String(args[0])), i);
          else if ([OPS.showText, OPS.showSpacedText, OPS.nextLineShowText, OPS.nextLineSetSpacingShowText].includes(op)) {
            const mode = state.text & 3;
            if (mode === 0 || mode === 2) await color(state.fill, i);
            if (mode === 1 || mode === 2) await color(state.stroke, i);
          } else await paint(op, i);
        }
      };
      await visit(list);
      page.cleanup();
    }
    return { space: 'sRGB', conversion: 'PDF.js color-space conversion; gradient stops included', approximate: false, entries: [...entries.values()].sort((a, b) => a.value!.localeCompare(b.value!)) };
  } finally { await task.destroy(); }
}
