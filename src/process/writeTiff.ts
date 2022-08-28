import fs from 'fs-extra';
import { merge, isFunction, isObject } from 'lodash';
import Affine from '@sakitam-gis/affine/dist/index.mjs';
import { openAsync, GDT_Float32, Dataset, SpatialReference } from 'gdal-async';
import 'ndarray-gdal';
import { NdArray } from 'ndarray';
import { calcMinMax } from '../utils';
import { floatToGray } from './normalizeData';

export interface IBandsMapping {
  bandCount: number;
  name: string;
  label: string;
  process?: (v: NdArray) => NdArray;
}

export interface IWriteOptions {
  clear: boolean;
  width: number;
  height: number;
  dataType: string;
  bandCount: number;
  bandsFunction: (info: any) => boolean | Omit<IBandsMapping, 'bandCount'>;
  gray: boolean;
  drivers: string | string[];
  customProj4: string;
  customExtent: [number, number, number, number];
}

const defaultOptions = {
  clear: true,
  drivers: 'GTiff',
  gray: false,
  bandCount: 1,
  bandsFunction: () => true,
  dataType: GDT_Float32,
};

export default async (
  data,
  dstPath: string | Buffer,
  opt: Partial<IWriteOptions> = {},
): Promise<
  | {
      path: string | Buffer;
      data: Dataset;
    }
  | undefined
> => {
  try {
    const options = merge({}, defaultOptions, opt);

    const stat = await fs.pathExists(dstPath);

    if (!options.clear) {
      if (stat) {
        return {
          path: dstPath,
          data: await openAsync(dstPath),
        };
      }
    } else {
      if (stat) {
        await fs.removeSync(dstPath);
      }
    }

    let lastDst = data[1];

    if (!lastDst && data[0]) {
      lastDst = await openAsync(data[0]);
    }

    const bands = lastDst.bands;
    const size = lastDst.rasterSize;

    const count = bands.count();

    const bandsMapping: IBandsMapping[] = [];

    for (let i = 1; i < count + 1; i++) {
      const e = bands.get(i);
      const info = e.getMetadata();
      const cfg = options.bandsFunction(info);
      if (cfg) {
        const mergeConfig = isObject(cfg) ? cfg : ({} as Omit<IBandsMapping, 'bandCount'>);
        bandsMapping.push({
          bandCount: i,
          ...mergeConfig,
        });
      }
    }

    await fs.ensureFileSync(dstPath);

    const dst = await openAsync(
      dstPath,
      'w',
      options.drivers,
      size.x || options.width,
      size.y || options.height,
      bandsMapping.length || options.bandCount,
      options.dataType,
    );

    let srs = lastDst.srs;
    let geoTransform = lastDst.geoTransform;
    if (options.customProj4) {
      srs = SpatialReference.fromProj4(options.customProj4);
    }

    if (options.customExtent) {
      const [west, south, east, north] = options.customExtent;
      const t = Affine.translation(west, north);
      const s = Affine.scale(
        (east - west) / (options.width !== undefined ? options.width : size.x),
        (south - north) / (options.height !== undefined ? options.height : size.y),
      );
      geoTransform = t.multiply(s).toGdal();
    }

    dst.srs = srs;
    dst.geoTransform = geoTransform;

    for (let j = 0; j < bandsMapping.length; j++) {
      const config = bandsMapping[j];
      const e = bands.get(config.bandCount);
      const info = e.getMetadata();
      const pixelsData = await e.pixels.readArrayAsync();

      if (isFunction(config.process)) {
        config.process(pixelsData);
      }

      const [min, max] = calcMinMax(pixelsData.data);

      if (options.gray) {
        floatToGray(pixelsData, min, max);
      }
      const targetBand = dst.bands.get(j + 1);
      if (targetBand) {
        const pixel = targetBand.pixels;
        await targetBand.setMetadataAsync({
          min,
          max,
          ...info,
        });
        await pixel.writeArrayAsync({
          data: pixelsData,
        });
      }
    }

    return {
      path: dstPath,
      data: dst,
    };
  } catch (e) {
    console.error('[writeTiff]: ', e);
  }
};
