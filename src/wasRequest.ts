import type { WasClient, ResourceData, Json } from '@interop/was-client'

/**
 * Thin wrapper around a `WasClient` bound to one Space -- so callers write
 * `put(collectionId, resourceId, data)` instead of repeating the
 * `client.space(id).collection(id).resource(id)` navigation everywhere.
 *
 * Every write goes through the real `@interop/was-client` (a signed
 * capability invocation), never a bare `fetch` -- WAS write endpoints always
 * require one.
 */
export class WasServer {
  #client: WasClient
  #spaceId: string

  constructor({ client, spaceId }: { client: WasClient; spaceId: string }) {
    this.#client = client
    this.#spaceId = spaceId
  }

  /**
   * Creates or replaces a resource by id (upsert). Throws `NotFoundError` if
   * the collection doesn't exist yet -- WAS does not auto-create parents, so
   * `posts`/`assets` must be created once before this is called.
   *
   * @returns {Promise<{ etag?: string }>}   the stored resource's new ETag
   */
  put(collectionId: string, resourceId: string, data: ResourceData) {
    return this.#client
      .space(this.#spaceId)
      .collection(collectionId)
      .resource(resourceId)
      .put(data)
  }

  /**
   * The full body of every resource currently in the collection. `list()` on
   * the underlying client only returns summaries (id/url/contentType), so
   * this fetches each one's actual content afterward. Returns `[]` if the
   * collection is missing or not visible to you (404 conflation caveat).
   */
  async list(collectionId: string): Promise<Json[]> {
    const collection = this.#client.space(this.#spaceId).collection(collectionId)
    const listing = await collection.list()
    console.log("🚀 ~ WasServer ~ list ~ listing:", listing)
    if (!listing) return []
    const bodies = await Promise.all(
      listing.items.map((item) => collection.get(item.id)),
    )
    console.log("🚀 ~ WasServer ~ list ~ bodies:", bodies)
    const result = bodies.filter(
      (body): body is Json => body !== null && !(body instanceof Blob),
    )
    console.log("🚀 ~ WasServer ~ list ~ result:", result)

    return result
  }
}
  