// Build-time plain-text download of the full dataset, grouped by tier.
import { toTXT } from '../utils/dataset';

export const GET = () =>
  new Response(toTXT(), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
