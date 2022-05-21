import path from 'path';
import fs from 'fs-extra';
import { test, expect, describe, beforeAll } from 'vitest';
import RasterProcess from '../src/index';

const dataPath = path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25.grib');
const tiffPath = path.resolve(__dirname, './fixtures/result/gfs.t12z.pgrb2.0p25.tiff');

beforeAll(async () => {
  console.log(`[RasterProcess]: start testing...`);
});

describe('task', async () => {
  test('ReadData', (cb) => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    rp.use(new RasterProcess.task.ReadData()).run([dataPath], (res) => {
      expect(res[0]).toEqual(dataPath);
    });
  });

  test('WriteTiff', (cb) => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    rp
      .use(new RasterProcess.task.ReadData())
      .use(new RasterProcess.task.WriteTiff(tiffPath, {
        clear: true,
        customProj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs', // 4326
        customExtent: [-180, -85.05112877980659, 180, 85.05112877980659],
      }))
      .run([dataPath], (res) => {
        const stat = fs.pathExistsSync(tiffPath);
        expect(stat).toBe(true);
        cb();
      });
  });
});
