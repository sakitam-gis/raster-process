import path from 'path';
import fs from 'fs-extra';
import { test, expect, describe, beforeAll } from 'vitest';
import RasterProcess from '../src/index';

const dataPath = path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25.grib');
const tiffPath = path.resolve(__dirname, './fixtures/result/gfs.t12z.pgrb2.0p25.tiff');

beforeAll(async () => {
  console.log(`[RasterProcess]: start testing...`);
});

describe('task', () => {
  test('ReadData', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      const res = await rp.use(new RasterProcess.task.ReadData()).run([dataPath]);
      // @ts-ignore
      expect(res[0]).toEqual(dataPath);
    } catch (e) {
      console.log(e);
    }
  });

  test('WriteTiff', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      await rp
        .use(new RasterProcess.task.ReadData())
        .use(new RasterProcess.task.WriteTiff(tiffPath, {
          clear: true,
          // customProj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs', // 4326
          // customExtent: [-180, -85.05112877980659, 180, 85.05112877980659],
        }))
        .run([dataPath]);
      const stat = fs.pathExistsSync(tiffPath);
      expect(stat).toBe(true);
    } catch (e) {
      console.log(e);
    }
  });

  test('WriteTiff with custom options', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      await rp
        .use(new RasterProcess.task.ReadData())
        .use(new RasterProcess.task.WriteTiff(tiffPath, {
          clear: true,
          customProj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs', // 4326
          customExtent: [-180, -85.05112877980659, 180, 85.05112877980659],
        }))
        .run([dataPath]);
      const stat = fs.pathExistsSync(tiffPath);
      expect(stat).toBe(true);
    } catch (e) {
      console.log(e);
    }
  });
});
