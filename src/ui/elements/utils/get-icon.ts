function getIconHTML(paths: string[], iconSize?: number, shapes?: string[]): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" ${iconSize ? `width="${iconSize}" height="${iconSize}"` : ''} viewBox="0 0 24 24"
    class="h-4 w-4" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${shapes ? shapes.map(s => s).join('') : ''}
      ${paths.map(d => `<path d="${d}"></path>`).join('')}
    </svg>
  `;
}

const CheckboxPath: string[] = ['M20 6 9 17l-5-5'];
const CloseIconPath: string[] = ['M18 6 6 18', 'm6 6 12 12'];
const FileChartColumnIconPath: string[] = ['M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z', 'M14 2v5a1 1 0 0 0 1 1h5', 'M8 18v-1', 'M12 18v-6', 'M16 18v-3'];
const TramFrontIconPath: string[] = ['M4 11h16', 'M12 3v8', 'm8 19-2 3', 'm18 22-2-3', 'M8 15h.01', 'M16 15h.01'];
const TramFrontIconShapes: string[] = ['<rect width="16" height="16" x="4" y="3" rx="2"/>'];

export const TramFrontIconHTML: string = getIconHTML(TramFrontIconPath, 24, TramFrontIconShapes);
export const FileChartColumnIconHTML: string = getIconHTML(FileChartColumnIconPath, 24);

export const CheckboxIconHTML: string = getIconHTML(CheckboxPath);
export const CloseIconHTML: string = getIconHTML(CloseIconPath);
