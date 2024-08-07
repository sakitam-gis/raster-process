import path from 'path';
import fs from 'fs-extra';
import { test, expect, describe, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import { RasterProcess } from '../src';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

const dataPath = path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25.grib');
const tiffPath = path.resolve(__dirname, './fixtures/result/gfs.t12z.pgrb2.0p25.tiff');
const mercatorTiffPath = path.resolve(__dirname, './fixtures/result/gfs.t12z.pgrb2.0p25-write-mercator.tiff');

const tilesPath = path.resolve(__dirname, './fixtures/result/tiles');
const jpegPath = path.resolve(__dirname, './fixtures/result/jpeg');
const pngPath = path.resolve(__dirname, './fixtures/result/png');
const mbPath = path.resolve(__dirname, './fixtures/result/mbtiles/tile.mbtiles');

beforeAll(async () => {
  console.log(`[RasterProcess]: start testing...`);
});

describe('task', () => {
  test('ReadData', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      const res = (await rp.use(new RasterProcess.task.ReadData()).run([dataPath])) as any;
      expect(res[0]).toEqual(dataPath);
      // expect((res[1] as Dataset).bands).toEqual(1);
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
        .use(
          new RasterProcess.task.WriteTiff(tiffPath, {
            clear: true,
            // customProj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs', // 4326
            // customExtent: [-180, -85.05112877980659, 180, 85.05112877980659],
          }),
        )
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
        .use(
          new RasterProcess.task.WriteTiff(tiffPath, {
            clear: true,
            // customProj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs', // 4326
            // customExtent: [-180, -85.05112877980659, 180, 85.05112877980659],
          }),
        )
        .run([dataPath]);
      const stat = fs.pathExistsSync(tiffPath);
      expect(stat).toBe(true);
    } catch (e) {
      console.log(e);
    }
  });

  test('Reproject', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      await rp
        .use(new RasterProcess.task.ReadData())
        .use(
          new RasterProcess.task.Reproject(mercatorTiffPath, {
            width: 1024,
            height: 1024,
            clear: true,
            destinationProj4:
              '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs', // 3857
            destinationExtent: [-20037508.342789244, -20037508.342789255, 20037508.342789244, 20037508.342789244],
          }),
        )
        .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25.tiff')]);
      const stat = fs.pathExistsSync(mercatorTiffPath);
      expect(stat).toBe(true);
    } catch (e) {
      console.log(e);
    }
  });

  test('GenerateTiles', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      await rp
        .use(new RasterProcess.task.ReadData())
        .use(
          new RasterProcess.task.GenerateTiles(tilesPath, {
            clear: true,
            gray: true,
            writeExif: true,
            zooms: [0, 1, 1],
          }),
        )
        .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25-write-mercator.tiff')]);
      const stat = fs.pathExistsSync(path.join(tilesPath, 'tiles/TMP/0/0/0.tiff'));
      expect(stat).toBe(true);
    } catch (e) {
      console.log(e);
    }
  });

  test('GenerateJPEG', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      await rp
        .use(new RasterProcess.task.ReadData())
        .use(
          new RasterProcess.task.GenerateJPEG(jpegPath, {
            clear: true,
            tileFolder: '',
          }),
        )
        .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25-write-mercator.tiff')]);
      const stat = fs.pathExistsSync(path.join(jpegPath, 'gfs.t12z.pgrb2.0p25-write-mercator.jpeg'));
      expect(stat).toBe(true);
    } catch (e) {
      console.log(e);
    }
  });

  test('GeneratePNG', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      await rp
        .use(new RasterProcess.task.ReadData())
        .use(
          new RasterProcess.task.GeneratePNG(pngPath, {
            clear: true,
            tileFolder: '',
          }),
        )
        .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25-write-mercator.tiff')]);
      const stat = fs.pathExistsSync(path.join(pngPath, 'gfs.t12z.pgrb2.0p25-write-mercator.png'));
      expect(stat).toBe(true);
    } catch (e) {
      console.log(e);
    }
  });

  test('UploadOSS', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      const res: any[] = (await rp
        .use(new RasterProcess.task.ReadData())
        .use(
          new RasterProcess.task.UploadOSS({
            // region填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
            region: process.env.region as string,
            // 阿里云账号AccessKey拥有所有API的访问权限，风险很高。强烈建议您创建并使用RAM用户进行API访问或日常运维，请登录RAM控制台创建RAM用户。
            accessKeyId: process.env.accessKeyId as string,
            accessKeySecret: process.env.accessKeySecret as string,
            // 填写Bucket名称。
            bucket: process.env.bucket as string,
            folder: 'tmp',
            pathFunction: (url, f) => path.join(f as string, url.replace(jpegPath, '')),
          }),
        )
        .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25-write-mercator.tiff')])) as any[];
      expect(res[0].length > 0).toBe(true);
    } catch (e) {
      console.log(e);
    }
  });

  test('WriteMBTile', async () => {
    const rp = new RasterProcess();
    expect(rp).toBeInstanceOf(RasterProcess);
    try {
      await rp
        .use(new RasterProcess.task.ReadData())
        .use(
          new RasterProcess.task.GenerateTiles(tilesPath, {
            clear: true,
            gray: true,
            writeExif: true,
            zooms: [0, 1, 1],
          }),
        )
        .use(
          new RasterProcess.task.GeneratePNG(pngPath, {
            clear: true,
          }),
        )
        .use(
          new RasterProcess.task.WriteMBTile(mbPath, {
            mode: 'rwc',
          }),
        )
        .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25-write-mercator.tiff')]);
      const stat = fs.pathExistsSync(mbPath);
      expect(stat).toBe(true);
    } catch (e) {
      console.log(e);
    }
  });
});
