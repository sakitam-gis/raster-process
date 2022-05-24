import { CoordinateTransformation, SpatialReference } from 'gdal-async';
import type { Dataset } from 'gdal-async';

/**
 * constrain n to the given range
 * @param n value
 * @param min the minimum value to be returned
 * @param max the maximum value to be returned
 * @returns the clamped value
 * @private
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * constrain n to the given range, excluding the minimum, via modular arithmetic
 * @param n value
 * @param min the minimum value to be returned, exclusive
 * @param max the maximum value to be returned, inclusive
 * @returns constrained number
 * @private
 */
export function wrap(n: number, min: number, max: number): number {
  const d = max - min;
  const w = ((n - min) % d + d) % d + min;
  return (w === min) ? max : w;
}

/**
 * get proj string form dataset
 * @param ds
 */
export function getProjFromDataset(ds: Dataset) {
  if (!ds) return;
  return ds.srs?.toProj4();
}

/**
 * get raster extent from dataset
 * @param ds
 */
export function getExtentFromDataSet(ds: Dataset) {
  if (!ds) return;
  const size = ds.rasterSize;
  const geoTransform: number[] | null = ds.geoTransform;
  if (geoTransform && geoTransform.length > 0 && size.x > 0 && size.y > 0) {
    const minx = geoTransform[0]
    const maxy = geoTransform[3]
    const maxx = minx + geoTransform[1] * size.x;
    const miny = maxy + geoTransform[5] * size.y;
    return [minx, miny, maxx, maxy];
  }
  return;
}

/**
 * transform coordinates by target srs
 * @param coordinates
 * @param source
 * @param target
 */
export function transformPoint(coordinates: number[], source: string, target: string) {
  const s = SpatialReference.fromProj4(source);
  let x = coordinates[0];
  let y = coordinates[1];
  const z = coordinates[2];
  if (s.isSame(SpatialReference.fromProj4('+proj=longlat +R=6371229 +no_defs'))) {
    x = clamp(x, -180, 180);
    y = clamp(x, -90, 90);
  }
  const tr = new CoordinateTransformation(SpatialReference.fromProj4(source), SpatialReference.fromProj4(target));
  return tr.transformPoint(x, y, z);
}

/**
 * transform extent by target srs
 * @param extent
 * @param source
 * @param target
 */
export function transformExtent(extent: number[], source: string, target: string) {
  const leftBottom = [extent[0], extent[1]];
  const rightTop = [extent[2], extent[3]];
  const p1 = transformPoint(leftBottom, source, target);
  const p2 = transformPoint(rightTop, source, target);
  return [
    p1.x, p1.y,
    p2.x, p2.y,
  ]
}

/**
 * calc array min and max value
 * @param array
 */
export function calcMinMax(array: number[]) {
  let min = Infinity;
  let max = Infinity;
  // @from: https://stackoverflow.com/questions/13544476/how-to-find-max-and-min-in-array-using-minimum-comparisons
  for (let i = 0; i < array.length; i++) {
    const val = array[i];

    if (min === Infinity) {
      min = val;
    } else if (max === Infinity) {
      max = val;
      // update min max
      // 1. Pick 2 elements(a, b), compare them. (say a > b)
      min = Math.min(min, max);
      max = Math.max(min, max);
    } else {
      // 2. Update min by comparing (min, b)
      // 3. Update max by comparing (max, a)
      min = Math.min(val, min);
      max = Math.max(val, max);
    }
  }
  return [min, max];
}

export type IRItem = {
  id: string;
  path: string | Buffer | string[];
  data: Dataset | Map<string, string> | null;
  options: any;
};

export function safePush(array: IRItem[] = [], item: IRItem) {
  let result: IRItem[] = array;
  if (!Array.isArray(array)) {
    result = [];
  }
  result.push(item);
  return result;
}

export function diffMap(source, target) {
  let testVal;
  const diff = new Map();

  for (const [key, val] of source) {
    testVal = target.get(key);
    if (testVal !== val || (testVal === undefined && !target.has(key))) {
      diff.set(key, val);
    }
  }
  return diff;
}

export function isValid(val: any, checkString = false) {
  let f = val !== null && val !== undefined && !isNaN(val) && val !== Infinity;
  if (checkString) {
    f = f && val !== '';
  }
  return f;
}
