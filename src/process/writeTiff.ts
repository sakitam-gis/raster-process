import fs from 'fs-extra';
import { merge } from 'lodash';
import { openAsync, GDT_Float32, GRA_NearestNeighbor } from 'gdal-async';
import 'ndarray-gdal';
import { extent, mercatorExtent } from '../config';
import { calcMinMax } from '../utils';

export interface IWriteOptions {
  clear: boolean;
  width: number;
  height: number;
  dataType: string;
  bandCount: number;
  drivers: string | string[];
  resampling: string;
  sourceProj4: string;
  sourceExtent: [number, number, number, number];
  destinationProj4: string;
  destinationExtent: [number, number, number, number];
}

const defaultOptions = {
  clear: true,
  width: 256,
  height: 256,
  drivers: 'GTiff',
  bandCount: 1,
  dataType: GDT_Float32,
  resampling: GRA_NearestNeighbor,
  sourceProj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs', // 4326
  sourceExtent: extent,
  destinationProj4: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs', // 3857
  destinationExtent: mercatorExtent,
};

export default async (data, dstPath: string | Buffer, opt: Partial<IWriteOptions> = {}) => {
  const options = merge(defaultOptions, opt)

  const stat = await fs.pathExists(dstPath);

  if (!options.clear) {
    if (stat) {
      return dstPath;
    }
  } else {
    if (stat) {
      await fs.removeSync(dstPath);
    }
  }

  const bands = data.bands;
  const size = data.rasterSize;

  const count = bands.count();

  const dst = await openAsync(dstPath, 'w', options.drivers, size.x || options.width, size.y || options.height, count || options.bandCount, options.dataType);

  dst.srs = data.srs;
  dst.geoTransform = data.geoTransform;

  for (let i = 1; i < count + 1; i++) {
    const e = bands.get(i);
    const info = e.getMetadata();
    const data = await e.pixels.readArrayAsync();
    const [min, max] = calcMinMax(data.data);
    const targetBand = dst.bands.get(i);
    if (targetBand) {
      const pixel = targetBand.pixels;
      await targetBand.setMetadataAsync({
        min,
        max,
        ...info,
      })
      await pixel.writeArrayAsync({
        x: 0,
        y: 0,
        data,
      })
    }
  }

  return dstPath;
};
