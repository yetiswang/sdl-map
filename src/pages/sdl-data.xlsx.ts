// Build-time Excel download of the full dataset (see src/utils/xlsx.ts).
import { buildXLSX } from '../utils/xlsx';

export const GET = () =>
  new Response(new Uint8Array(buildXLSX()), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="sdl-landscape.xlsx"',
      'cache-control': 'public, max-age=3600',
    },
  });
