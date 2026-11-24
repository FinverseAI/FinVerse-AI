import { forwardApiRequest } from "../../../../lib/api-server";

async function forwardWatchlistItem(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return forwardApiRequest(request, `/api/watchlist/${encodeURIComponent(id)}`);
}

export { forwardWatchlistItem as DELETE, forwardWatchlistItem as PUT };
