import fs from 'fs-extra';
import path from 'path';
import { merge } from 'lodash';
import Affine from '@sakitam-gis/affine';
import { Constant, Mercantile } from '@sakitam-gis/mercantile';
import { openAsync, GDT_Float32, SpatialReference } from 'gdal-async';
import 'ndarray-gdal';
import ndarray from 'ndarray';
import { mercatorLngLatExtent } from '../config';
import { calcMinMax, diffMap } from '../utils';
import { floatToGray } from './normalizeData';
import enlargeData from './enlargeData';
import type { IEnlargeDataOptions } from './enlargeData';
import reproject from './reproject';

export interface IGenerateTileOptions {
  clear: boolean;
  tileSize: number;
  zooms: [number, number, number] | [number, number] | number;
  dataType: string;
  bandCount: number;
  drivers: string | string[];
  clipExtent: boolean;
  gray: boolean;
  tileFolder: string;
  cacheFolder: string;
  cacheFilePrefix: string;
  enlargeOptions: Partial<IEnlargeDataOptions>;
  tileExtent: [number, number, number, number];
  tileProj4: string;
}

const defaultOptions = {
  clear: true,
  drivers: 'GTiff',
  bandCount: 1,
  tileSize: 256,
  gray: false,
  clipExtent: false,
  tileExtent: mercatorLngLatExtent,
  zooms: [0, 5, 1], // start,end,step
  dataType: GDT_Float32,
  tileFolder: 'tiles',
  cacheFolder: 'cache',
  cacheFilePrefix: 'mercator',
  tileProj4:
    '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs', // 3857
};

async function checkAndLoad(p, clear = false, load = true): Promise<any> {
  try {
    const stat = await fs.pathExists(p);

    if (!clear) {
      if (stat) {
        return load ? [true, {
          path: p,
          data: await openAsync(p),
        }] : [true];
      }
      return [false];
    } else {
      if (stat) {
        await fs.removeSync(p);
      }
      return [false];
    }
  } catch (e) {
    console.error(e);
  }
}

export default async (
  data,
  folder: string,
  opt: Partial<IGenerateTileOptions> = {},
): Promise<{
  path: string[];
  data: Map<string, string>;
  errorData: Map<string, string>;
}> => {
  const options = merge({}, defaultOptions, opt);

  const tilesPath = new Map();
  const needPaths = new Map();
  try {
    let lastDst = data[1];

    if (!lastDst && data[0]) {
      lastDst = await openAsync(data[0]);
    }

    const zooms = Array.isArray(options.zooms)
      ? Constant.range(options.zooms[0], options.zooms[1], options.zooms[2])
      : Constant.range(options.zooms);
    for (let i = 0; i < zooms.length; i++) {
      const z = zooms[i];
      const tileWidth = options.tileSize * 2 ** z;
      const tileHeight = options.tileSize * 2 ** z;
      const dstSrc = path.join(folder, options.cacheFolder, `${options.cacheFilePrefix}-${z}.tiff`);
      const fc = await checkAndLoad(dstSrc, options.clear);
      // 如果有已生成的投影数据，直接从缓存取
      if (!fc[0]) {
        await fs.ensureFileSync(dstSrc);
      }
      const targetData = fc[0]
        ? fc[1]
        : await reproject(['', lastDst, []], dstSrc, {
          width: tileWidth,
          height: tileHeight,
        });
      const tiles = Mercantile.tiles(
        options.tileExtent[0],
        options.tileExtent[1],
        options.tileExtent[2],
        options.tileExtent[3],
        [z],
        options.clipExtent,
      );
      const largeData = await enlargeData([targetData.path, targetData.data], options.enlargeOptions || {});

      for (const tile of tiles) {
        const x = tile.getX();
        const y = tile.getY();
        const tileId = `${z}-${x}-${y}`;
        const tilePath = path.join(folder, options.tileFolder, String(z), String(x), `${y}.tiff`);
        const tileState = await checkAndLoad(tilePath, options.clear, false);
        needPaths.set(tileId, tilePath);
        if (tileState[0]) {
          tilesPath.set(tileId, tilePath);
          continue;
        } else {
          await fs.ensureFileSync(tilePath);
        }
        const bbox = tile.getBBox();

        const startX = x * options.tileSize;
        const endX = (x + 1) * options.tileSize + 1;
        const startY = y * options.tileSize;
        const endY = (y + 1) * options.tileSize + 1;

        const dst = ndarray([], [endX - startX, endY - startY]);

        const clipDst = largeData.data.hi(endY, endX).lo(startY, startX);

        for (let j = 0; j < clipDst.shape[0]; ++j) {
          for (let k = 0; k < clipDst.shape[1]; ++k) {
            const v = clipDst.get(j, k);
            dst.set(j, k, v);
          }
        }

        await fs.ensureFileSync(tilePath);
        const tileDst = await openAsync(
          tilePath,
          'w',
          'GTiff',
          dst.shape[0],
          dst.shape[1],
          options.bandCount,
        );

        const [west, south, east, north] = [
          bbox.getLeft(),
          bbox.getBottom(),
          bbox.getRight(),
          bbox.getTop(),
        ];
        const t = Affine.translation(west, north);
        const s = Affine.scale((east - west) / dst.shape[0], (south - north) / dst.shape[1]);
        tileDst.geoTransform = t.multiply(s).toGdal();

        tileDst.srs = SpatialReference.fromProj4(options.tileProj4);

        const pixel = tileDst.bands.get(1).pixels;
        const [min, max] = calcMinMax(dst.data);

        if (options.gray) {
          floatToGray(dst, min, max);
        }

        tileDst.setMetadata({
          min,
          max,
        });
        const imageData = ndarray(new Float32Array(dst.shape[0] * dst.shape[1]), dst.shape);

        for (let j = 0; j < dst.shape[0]; ++j) {
          for (let k = 0; k < dst.shape[1]; ++k) {
            const v = dst.get(j, k);
            imageData.set(j, k, v);
          }
        }

        await pixel.writeArrayAsync({
          x: 0,
          y: 0,
          width: imageData.shape[0],
          height: imageData.shape[1],
          data: imageData,
        });
        tilesPath.set(tileId, tilePath);
      }
    }

    return {
      path: Array.from(tilesPath, ([_, value]) => value),
      data: tilesPath,
      errorData: diffMap(needPaths, tilesPath),
    };
  } catch (e) {
    console.error(e);
    return {
      path: [],
      data: tilesPath,
      errorData: diffMap(needPaths, tilesPath),
    };
  }
};
