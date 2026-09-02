// Build-time CSV download of the full dataset. Same column contract as the
// .txt and .xlsx endpoints (src/utils/dataset.ts) — regenerated every deploy,
// so downloads can never drift from the map.
import { toCSV } from '../utils/dataset';

export const GET = () =>
  new Response(toCSV(), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="sdl-landscape.csv"',
      'cache-control': 'public, max-age=3600',
    },
  });
