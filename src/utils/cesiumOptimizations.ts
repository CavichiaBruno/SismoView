/**
 * Utilities for optimizing Cesium tile caching and imagery layer management.
 * Reduces repeated downloads of tiles and improves performance.
 */

/**
 * Configure optimal tile cache settings for Cesium viewer.
 * @param viewer - The Cesium Viewer instance
 * @param cacheSize - Number of tiles to cache (default: 512)
 */
export function optimizeCesiumTileCache(
  viewer: any, // Cesium Viewer type
  cacheSize: number = 512
): void {
  if (!viewer?.scene?.globe) return;

  // Increase tile cache to reduce re-downloads
  viewer.scene.globe.tileCacheSize = Math.max(150, cacheSize);

  // Enable imagery layer cache
  if (viewer.imageryLayers && viewer.imageryLayers.imageryLayerCollection) {
    viewer.imageryLayers.imageryLayerCollection.forEach((layer: any) => {
      if (layer.imageryProvider?.tileCache) {
        layer.imageryProvider.tileCache.maximumSize = Math.max(256, Math.floor(cacheSize / 2));
      }
    });
  }
}

/**
 * Pre-warm tile cache by loading tiles around a specific location.
 * This reduces initial load times when users first interact with the map.
 */
export function prewarmTileCache(
  viewer: any, // Cesium Viewer type
  centerLongitude: number,
  centerLatitude: number
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const { Cartesian3, Cartographic } = (window as any).Cesium;

      if (!Cartesian3 || !Cartographic) {
        resolve();
        return;
      }

      const center = Cartographic.fromDegrees(centerLongitude, centerLatitude);

      // Fly to location to trigger tile loading
      viewer.camera.flyTo({
        destination: Cartesian3.fromRadians(
          center.longitude,
          center.latitude,
          1000000
        ),
        duration: 0,
        complete: () => {
          // Small delay to allow tiles to load
          setTimeout(resolve, 1000);
        },
      });
    } catch {
      resolve();
    }
  });
}

/**
 * Cache imagery provider tiles to IndexedDB for offline capability.
 * This is a best-effort implementation that stores recently viewed tiles.
 */
const TILE_CACHE_DB_NAME = 'SismoViewTileCache';
const TILE_CACHE_STORE_NAME = 'tiles';

interface CachedTile {
  url: string;
  data: ArrayBuffer;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Store a tile in IndexedDB cache.
 */
export async function cacheTileToIndexedDB(
  url: string,
  data: ArrayBuffer,
  ttlDays: number = 30
): Promise<void> {
  try {
    const db = await openTileDatabase();
    const ttl = ttlDays * 24 * 60 * 60 * 1000;

    const transaction = db.transaction([TILE_CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(TILE_CACHE_STORE_NAME);

    const tile: CachedTile = {
      url,
      data,
      timestamp: Date.now(),
      ttl,
    };

    await store.put(tile, url);
  } catch {
    // Silently fail - caching is optional
  }
}

/**
 * Retrieve a tile from IndexedDB cache.
 */
export async function getTileFromIndexedDB(
  url: string
): Promise<ArrayBuffer | null> {
  try {
    const db = await openTileDatabase();
    const transaction = db.transaction([TILE_CACHE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(TILE_CACHE_STORE_NAME);

    return new Promise((resolve) => {
      const request = store.get(url);
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const result = request.result as CachedTile | undefined;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if cache expired
        const age = Date.now() - result.timestamp;
        if (age > result.ttl) {
          // Delete expired entry
          store.delete(url);
          resolve(null);
        } else {
          resolve(result.data);
        }
      };
    });
  } catch {
    return null;
  }
}

/**
 * Clear old tiles from IndexedDB to free up space.
 */
export async function clearExpiredTiles(): Promise<void> {
  try {
    const db = await openTileDatabase();
    const transaction = db.transaction([TILE_CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(TILE_CACHE_STORE_NAME);

    return new Promise((resolve) => {
      const request = store.openCursor();
      request.onerror = () => resolve();
      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          const tile = cursor.value as CachedTile;
          const age = Date.now() - tile.timestamp;
          if (age > tile.ttl) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  } catch {
    // Silently fail
  }
}

/**
 * Open or create the tile cache database.
 */
function openTileDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TILE_CACHE_DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(TILE_CACHE_STORE_NAME)) {
        db.createObjectStore(TILE_CACHE_STORE_NAME);
      }
    };
  });
}

/**
 * Get storage quota usage for tile cache.
 */
export async function getTileCacheSize(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage || 0,
    quota: estimate.quota || 0,
    percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
  };
}

/**
 * Request persistent storage permission.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
