import fs from 'fs-extra';
import { merge } from 'lodash';
import Affine from '@sakitam-gis/affine';
import { openAsync, GDT_Float32, Dataset, SpatialReference } from 'gdal-async';
import 'ndarray-gdal';
import { calcMinMax } from '../utils';
import {floatToGray} from "./normalizeData";

export interface IWriteOptions {
  clear: boolean;
  width: number;
  height: number;
  dataType: string;
  bandCount: number;
  gray: boolean;
  drivers: string | string[];
  customProj4: string;
  customExtent: [number, number, number, number];
}

const defaultOptions = {
  clear: true,
  drivers: 'GTiff',
  bandCount: 1,
  gray: false,
  dataType: GDT_Float32,
};

export default async (
  data,
  dstPath: string | Buffer,
  opt: Partial<IWriteOptions> = {},
): Promise<{
  path: string | Buffer;
  data: Dataset;
}> => {
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

  const dst = await openAsync(
    dstPath,
    'w',
    options.drivers,
    size.x || options.width,
    size.y || options.height,
    count || options.bandCount,
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

  for (let i = 1; i < count + 1; i++) {
    const e = bands.get(i);
    const info = e.getMetadata();
    const pixelsData = await e.pixels.readArrayAsync();
    const [min, max] = calcMinMax(pixelsData.data);
    if (options.gray) {
      floatToGray(pixelsData, min, max);
    }
    const targetBand = dst.bands.get(i);
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
};
