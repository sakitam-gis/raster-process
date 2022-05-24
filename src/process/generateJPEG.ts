import path from 'path';
import fs from 'fs-extra';
import { merge } from 'lodash';
import { openAsync, drivers } from 'gdal-async';
import type { Dataset } from 'gdal-async';

export interface IGenerateJPEGOptions {
  clear: boolean;
  quality: number;
  drivers: string | string[];
  tileFolder: string;
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
  jpegDst.flush();
  jpegDst.close();

  lastDst.flush();
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
        const [z, x, y] = key.split('-');
        const tilePath = path.join(folder, options.tileFolder, String(z), String(x), `${y}.jpeg`);
        const r = await process([value], tilePath, options);
        tilesPath.set(key, r.path);
      }
      res = {
        path: Array.from(tilesPath, ([_, value]) => value),
        data: tilesPath,
      };
    } else {
      const ext = path.extname(data[0]);
      const nm = data[0].replace(new RegExp(ext + '$'), '');
      res = await process(data, path.join(folder, options.tileFolder, `${nm}.jpeg`), options);
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
