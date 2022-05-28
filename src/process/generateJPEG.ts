import path from 'path';
import fs from 'fs-extra';
import { merge, isFunction } from 'lodash';
import { openAsync, drivers } from 'gdal-async';
import type { Dataset } from 'gdal-async';

export interface IGenerateJPEGOptions {
  clear: boolean;
  quality: number;
  drivers: string | string[];
  tileFolder: string;
  name: string | ((p: string, t: string, n: string, z?: number, x?: number, y?: number) => string);
}

type IRes = {
  path: string[] | string;
  data: Map<string, string> | Dataset | null;
};

const defaultOptions = {
  clear: true,
  drivers: 'JPEG',
  tileFolder: 'jpeg',
  quality: 90,
};

async function process(data, tilePath, options) {
  const stat = await fs.pathExists(tilePath);

  if (!options.clear) {
    if (stat) {
      return {
        path: tilePath,
        data: await openAsync(tilePath),
      };
    }
  } else {
    if (stat) {
      await fs.removeSync(tilePath);
    }
  }

  let lastDst = data[1];

  if (!lastDst && data[0]) {
    lastDst = await openAsync(data[0]);
  }

  await fs.ensureFileSync(tilePath);

  const driver = drivers.get(options.drivers);
  const jpegDst = await driver.createCopyAsync(
    tilePath,
    lastDst,
    {
      TYPE: 'Byte',
      QUALITY: options.quality,
    },
    false,
  );
  await jpegDst.flushAsync();
  await lastDst.flushAsync();
  lastDst.close();

  return {
    path: tilePath,
    data: jpegDst,
  };
}

export default async (
  data,
  folder: string,
  opt: Partial<IGenerateJPEGOptions> = {},
): Promise<IRes> => {
  const options = merge({}, defaultOptions, opt);
  let res: IRes = {
    path: '',
    data: null,
  };
  try {
    if (Array.isArray(data[0]) && data[1] instanceof Map) {
      const tiles = Array.from(data[1], ([key, value]) => ({ key, value }));
      const tilesPath = new Map<string, string>();
      for (let i = 0; i < tiles.length; i++) {
        const { key, value } = tiles[i];
        const keys = key.split('-');
        let [bandName, z, x, y]: [string, number, number, number] = [] as unknown as [
          string,
          number,
          number,
          number,
        ];
        if (keys.length === 4) {
          [bandName, z, x, y] = keys;
        } else if (keys.length === 3) {
          bandName = '';
          [z, x, y] = keys;
        }
        const tilePath = isFunction(options.name)
          ? options.name(folder, options.tileFolder, bandName as unknown as string, z, x, y)
          : path.join(folder, options.tileFolder, bandName, String(z), String(x), `${y}.jpeg`);
        const r = await process([value], tilePath, options);
        tilesPath.set(key, r.path);
      }
      res = {
        path: Array.from(tilesPath, ([_, value]) => value),
        data: tilesPath,
      };
    } else {
      const ext = path.extname(data[0]);
      const name = path.basename(data[0])
      const nm = name.replace(new RegExp(ext + '$'), '');
      const filePath = isFunction(options.name) ? options.name(folder, options.tileFolder, nm) : path.join(folder, options.tileFolder, `${nm}.jpeg`);
      res = await process([data[0]], filePath, options);
    }
    return res;
  } catch (e) {
    console.error(e);
    return {
      path: '',
      data: null,
    };
  }
};
