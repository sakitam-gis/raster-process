import fs from 'fs-extra';
import { merge } from 'lodash';
import Affine from '@sakitam-gis/affine';
import {
  openAsync,
  reprojectImageAsync,
  GDT_Float32,
  GRA_NearestNeighbor,
  SpatialReference,
  Dataset,
} from 'gdal-async';
import { extent, mercatorExtent } from '../config';
import { transformExtent, getExtentFromDataSet, getProjFromDataset } from '../utils';

export interface IReprojectOptions {
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
  width: 256,
  height: 256,
  clear: true,
  drivers: 'GTiff',
  bandCount: 1,
  dataType: GDT_Float32,
  resampling: GRA_NearestNeighbor,
  sourceProj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs', // 4326
  sourceExtent: extent,
  destinationProj4:
    '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs', // 3857
  destinationExtent: mercatorExtent,
};

export default async (
  data,
  dstPath: string | Buffer,
  opt: Partial<IReprojectOptions> = {},
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

  await fs.ensureFileSync(dstPath);

  const dst = await openAsync(
    dstPath,
    'w',
    options.drivers,
    options.width,
    options.height,
    lastDst.bands.count() || options.bandCount,
    options.dataType,
  );

  let [west, south, east, north] = options.destinationExtent || [];
  if (!options.destinationExtent || options.destinationExtent.length < 4) {
    const bbox = getExtentFromDataSet(lastDst);
    if (bbox && bbox.length === 4) {
      const source = getProjFromDataset(lastDst) || options.sourceProj4;
      [west, south, east, north] = transformExtent(bbox, source, options.destinationProj4);
    }
  }

  dst.srs = SpatialReference.fromProj4(options.destinationProj4);
  const t = Affine.translation(west, north);
  const s = Affine.scale((east - west) / options.width, (south - north) / options.height);
  dst.geoTransform = t.multiply(s).toGdal();

  await reprojectImageAsync({
    src: lastDst,
    dst: dst,
    s_srs: lastDst.srs,
    t_srs: dst.srs,
    // http://naturalatlas.github.io/node-gdal/classes/Constants%20(GRA).html
    resampling: options.resampling,
  });

  return {
    path: dstPath,
    data: dst,
  };
};
