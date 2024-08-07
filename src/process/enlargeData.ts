import { merge } from 'lodash';
import { openAsync } from 'gdal-async';
import 'ndarray-gdal';
import ndarray from 'ndarray';
import type { NdArray } from 'ndarray';
import r from 'ndarray-concat-rows';
import c from 'ndarray-concat-cols';

export interface IEnlargeDataOptions {
  offset: number;
  bandsIndex: number;
}

const defaultOptions = {
  offset: 1,
  bandsIndex: 1,
};

export async function enlargeData(
  data,
  opt: Partial<IEnlargeDataOptions> = {},
): Promise<{
  path: string | Buffer;
  data: NdArray;
}> {
  const options = merge({}, defaultOptions, opt);
  let lastDst = data[1];

  if (!lastDst && data[0]) {
    lastDst = await openAsync(data[0]);
  }
  const e = lastDst.bands.get(options.bandsIndex);
  const pixelsData = e.pixels.readArray({
    width: e.size.x,
    height: e.size.y,
  });

  const rowDst = ndarray([], [options.offset, pixelsData.shape[1]]);

  const row = pixelsData.lo(pixelsData.shape[1] - options.offset, 0); // 取最后一行

  for (let i = 0; i < row.shape[0]; ++i) {
    for (let j = 0; j < row.shape[1]; ++j) {
      const v = row.get(i, j);
      rowDst.set(i, j, v);
    }
  }
  const d = r([pixelsData, rowDst]);

  const colDst = ndarray([], [d.shape[0], options.offset]);
  const col = d.hi(d.shape[0], options.offset); // 取第一列

  for (let i = 0; i < col.shape[0]; ++i) {
    for (let j = 0; j < col.shape[1]; ++j) {
      const v = col.get(i, j);
      colDst.set(i, j, v);
    }
  }

  return {
    path: data[0],
    data: c([colDst, d]),
  };
}

export default enlargeData;
