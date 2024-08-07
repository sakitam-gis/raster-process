## raster-process

[![CI](https://github.com/sakitam-gis/raster-process/actions/workflows/ci.yml/badge.svg)](https://github.com/sakitam-gis/raster-process/actions/workflows/ci.yml) [![npm version](https://badgen.net/npm/v/@sakitam-gis/raster-process)](https://npm.im/@sakitam-gis/raster-process) [![npm downloads](https://badgen.net/npm/dm/@sakitam-gis/raster-process)](https://npm.im/@sakitam-gis/raster-process) [![Coverage Status](https://coveralls.io/repos/github/sakitam-gis/raster-process/badge.svg?branch=master)](https://coveralls.io/github/sakitam-gis/raster-process?branch=master)

A raster data process utilities.

### 安装

```bash
npm i @sakitam-gis/raster-process -S

import { RasterProcess } from '@sakitam-gis/raster-process'
```

### 使用

```ts
const process = new RasterProcess();
process.use(task).use(task);
```

### 处理 `GFS` 格点数据

```ts
const path = require('path');

require('dotenv').config({
  path: path.resolve(process.cwd(), '.env'),
});

const { RasterProcess } =  require('../');

function run () {
  const rp = new RasterProcess();

  // const dataPath = path.resolve(__dirname, '../test/fixtures/gfs.t12z.pgrb2.0p25.grib');
  const dataPath = path.resolve(__dirname, './data/result/1.tiff');
  const tiffPath = path.resolve(__dirname, './data/result/gfs.t12z.pgrb2.0p25.tiff');
  const mercatorTiffPath = path.resolve(__dirname, './data/result/gfs.t12z.pgrb2.0p25-write-mercator.tiff');

  const tempPath = path.resolve(__dirname, './data/result/tiles');
  const jpegPath = path.resolve(__dirname, './data/result');
  const mbPath = path.resolve(__dirname, './data/result/mbtiles/tile.mbtiles');

  rp
    .use(
      new RasterProcess.task.ReadData(),
    )
    .use(
      new RasterProcess.task.WriteTiff(tiffPath, {
        clear: true,
        gray: false,
        bandsFunction: (info) => {
          const t = info.GRIB_PDS_TEMPLATE_ASSEMBLED_VALUES.split(' ');
          if (info.GRIB_ELEMENT === 'TMP') {
            return {
              name: 'TMP',
              label: '温度',
              process: (v) => RasterProcess.normalizeDataProcess.subScalar(v, 0),
            };
          }
          return false;
        },
        customProj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs', // 4326
        customExtent: [-180, -85.05112877980659, 180, 85.05112877980659],
      }),
    )
    .use(
      new RasterProcess.task.Reproject(mercatorTiffPath, {
        width: 1024,
        height: 1024,
        clear: true,
      }),
    )
    .use(
      new RasterProcess.task.GenerateTiles(tempPath, {
        clear: true,
        gray: true,
        writeExif: true,
        zooms: [0, 1, 1],
        bandName: '',
        reprojectOptions: {
          srcNodata: NaN,
          dstNodata: NaN,
        }
      }),
    )
    .use(
      new RasterProcess.task.GenerateJPEG(jpegPath, {
        clear: true,
      }),
    )
    .use(
      new RasterProcess.task.UploadOSS({
        // region填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
        region: process.env.region,
        // 阿里云账号AccessKey拥有所有API的访问权限，风险很高。强烈建议您创建并使用RAM用户进行API访问或日常运维，请登录RAM控制台创建RAM用户。
        accessKeyId: process.env.accessKeyId,
        accessKeySecret: process.env.accessKeySecret,
        // 填写Bucket名称。
        bucket: process.env.bucket,
        folder: 'tmp',
        pathFunction: (url, folder) => path.join(folder, url.replace(jpegPath, '')),
      })
    )
    .run([dataPath], (err, res) => {
      console.log(res);
    });
}

run();

```

### Task 列表
| Task Name     | Desc                                        |
| ------------- | ------------------------------------------- |
| ReadData      | Read data using GDAL                        |
| WriteTiff     | Write raster data to tiff                   |
| Reproject     | Reproject raster data to another projection |
| GenerateTiles | Generate Mercator raster tiles              |
| GenerateJPEG  | Generate jpeg file                          |
| GeneratePNG   | Generate png file                           |
| UploadOSS     | Upload generated raster data to oss         |
| WriteMBTile   | Generate mbtile file                        |

### 示例

#### ReadData

Options:

| Option    | Type    | Desc                                                |
| --------- | ------- |-----------------------------------------------------|
| autoClose | boolean | 是否自动关闭 Dataset，一般情况下我们不需要配置此参数，在链式操作中 Dataset 不需要关闭 |

```js
const rp = new RasterProcess();
const res = (await rp.use(new RasterProcess.task.ReadData()).run([dataPath]));
expect(res[0]).toEqual(dataPath);
```

#### WriteTiff

Options:

| Option        | Type     | Required | Desc                                                         |
| ------------- | -------- | -------- | ------------------------------------------------------------ |
| clear         | boolean  | false    | 是否自定清除已存在的 tiff 数据，默认是 false                 |
| width         | number   | false    | 默认是dataset 数据的 width                                   |
| height        | number   | false    | 默认是dataset 数据的 height                                  |
| dataType      | enum     | false    | 写入 Tiff 的数据类型，默认是 GDT_ Float32                    |
| bandCount     | number   | false    | 写入 Tiff 的数据的通道数，默认是原有栅格数据的通道数         |
| bandsFunction | Function | false    | 是否过滤原有数据的通道，默认所有通道都会返回 `true`, 你可以配置此项来过滤哪些通道是你需要写入到 tiff 数据的 |
| gray          | boolean  | false    | 是否转为灰度数据                                             |
| drivers       | enum     | false    | 默认为`GTiff`                                                |
| customProj4   | string   | false    | 自定义数据投影，默认从原始数据读取                           |
| customExtent  | number[] | false    | 自定义数据范围，默认从元数据读取                             |

```js
const rp = new RasterProcess();
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
```

#### Reporject

```
clear: boolean;
width: number;
height: number;
dataType: string;
bandCount: number;
drivers: string | string[];
resampling: string;
sourceProj4: string;
threads: number;
withMetadata: boolean;
sourceExtent: [number, number, number, number];
destinationProj4: string;
destinationExtent: [number, number, number, number];
cutline?: Geometry;
srcBands?: number[];
dstBands?: number[];
srcAlphaBand?: number;
dstAlphaBand?: number;
srcNodata?: number;
dstNodata?: number;
blend?: number;
memoryLimit?: number;
maxError?: number;
multi?: boolean;
```

Options:

| Option            | Type     | Required | Desc                                                         |
| ----------------- | -------- | -------- | ------------------------------------------------------------ |
| clear             | boolean  | false    | 是否自定清除已存在的投影后的数据，默认是 false               |
| width             | number   | false    | 默认是`256`                                                  |
| height            | number   | false    | 默认是`256`                                                  |
| dataType          | enum     | false    | 投影后的 DataSet 数据类型，默认是 GDT_ Float32               |
| bandCount         | number   | false    | 写入 DataSet 的数据的通道数，默认是原有栅格数据的通道数      |
| drivers           | enum     | false    | 默认为`GTiff`                                                |
| resampling        | enum     | false    | 重投影的重采样方式，默认是`GRA_NearestNeighbor`              |
| sourceProj4       | string   | false    | 手动指定源数据投影，默认从源数据读取                         |
| sourceExtent      | number[] | false    | 手动指定源数据范围，默认从源数据读取                         |
| withMetadata      | boolean  | false    | 是否同步元数据                                               |
| destinationProj4  | string   | false    | 手动指定目标投影，默认是墨卡托 proj4定义字符串               |
| destinationExtent | number[] | false    | 手动指定目标数据范围，默认根据目标投影从源数据数据范围转换   |
| threads           | number   | false    | 重投影使用的线程数，默认使用`os.cpus().length`，但是需要注意，默认的配置在虚拟机或者 docker 中可能会出问题，如果出现问题建议手动配置此参数 |
| others            |          |          | 其他配置项，请参照 `gdal-async` 文档的 `reprojectImage` 配置项 |

```js
const rp = new RasterProcess();
await rp
  .use(new RasterProcess.task.ReadData())
  .use(
  new RasterProcess.task.Reproject(mercatorTiffPath, {
    width: 1024,
    height: 1024,
    clear: true,
    destinationProj4:
    '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs', // 3857
    destinationExtent: [
      -20037508.342789244, -20037508.342789255, 20037508.342789244, 20037508.342789244,
    ],
  }),
)
  .run([dataPath]);
```

#### GenerateTiles

```
clear: boolean;
tileSize: number;
zooms: [number, number, number] | [number, number] | number;
dataType: string;
bandCount: number;
drivers: string | string[];
clipExtent: boolean;
writeExif: boolean;
gray: boolean;
bandName: string | ((zoom: string, band: number, info: any) => string);
tileFolder: string;
cacheFolder: string;
cacheFilePrefix: string;
enlargeOptions: Partial<IEnlargeDataOptions>;
tileExtent: [number, number, number, number];
tileProj4: string;
reprojectOptions: Partial<IReprojectOptions>;
```

Options:

| Option           | Type             | Required | Desc                                                         |
| ---------------- | ---------------- | -------- | ------------------------------------------------------------ |
| clear            | boolean          | false    | 是否自动清除已存在的瓦片数据和投影缓存数据，默认是 false     |
| tileSize         | number           | false    | 瓦片大小默认是`256`                                          |
| dataType         | enum             | false    | 生成瓦片的 DataSet 数据类型，默认是 GDT_ Float32             |
| bandCount        | number           | false    | 写入 DataSet 的数据的通道数，默认是`1`                       |
| drivers          | enum             | false    | 默认为`GTiff`                                                |
| gray             | boolean          | false    | 是否转灰度                                                   |
| writeExif        | boolean          | false    | 是否写入 exif 信息                                           |
| clipExtent       | boolean          | false    | 在生成墨卡托瓦片时如果瓦片的投影范围超过墨卡托规定的投影范围自动裁剪 |
| bandName         | string、Function | false    | 指定栅格数据的通道名称，这在处理`GFS`气象数据时非常有用      |
| tileFolder       | string           | false    | 生成瓦片的文件夹，默认是`tiles`                              |
| cacheFolder      | string           | false    | 在生产瓦片时我们需要针对每一级的原始数据做重投影，但是我们不需要每次都进行生成，可以在每次生成后通过文件缓存下来，这个配置就是指定了缓存的位置，当然我们也可以配置 `clear=true` 不进行缓存，此配置项默认是`cache` |
| cacheFilePrefix  | string           | false    | 缓存文件名称前缀，此配置项默认是`mercator`                   |
| tileProj4        | string           | false    | 每一层级重投影瓦片的配置，默认是墨卡托的 `proj4`             |
| tileExtent       | number[]         | false    | 每一层级重投影瓦片的配置，默认是墨卡托的全球范围             |
| reprojectOptions | object           | false    | 每一层级重投影瓦片的重投影配置，请参照`Reporject` 的配置项   |
| enlargeOptions   | object           | false    | 每一层级重投影瓦片外扩配置                                   |

```js
const rp = new RasterProcess();
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
```

#### GenerateJPEG

```
 clear: boolean;
 quality: number;
 drivers: string | string[];
 tileFolder: string;
 name: string | ((p: string, t: string, n: string, z?: number, x?: number, y?: number) => string);
```

Options:

| Option     | Type             | Required | Desc                                       |
| ---------- | ---------------- | -------- | ------------------------------------------ |
| clear      | boolean          | false    | 是否自动清除已存在的瓦片数据，默认是 false |
| quality    | number           | false    | 图片质量，默认是 `90`                      |
| drivers    | enum             | false    | 默认为`JPEG`                               |
| tileFolder | string           | false    | 生成图片存放的文件夹，默认是`jpeg`         |
| name       | string、Function | false    | 生成的图片名称                             |

```js
const rp = new RasterProcess();
await rp
  .use(new RasterProcess.task.ReadData())
  .use(
  new RasterProcess.task.GenerateJPEG(jpegPath, {
    clear: true,
  }),
)
  .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25-write-mercator.tiff')]);
```

#### GeneratePNG

```
 clear: boolean;
 quality: number;
 drivers: string | string[];
 tileFolder: string;
 name: string | ((p: string, t: string, n: string, z?: number, x?: number, y?: number) => string);
```

Options:


| Option     | Type             | Required | Desc                                       |
| ---------- | ---------------- | -------- | ------------------------------------------ |
| clear      | boolean          | false    | 是否自动清除已存在的瓦片数据，默认是 false |
| quality    | number           | false    | 图片质量，默认是 `90`                      |
| drivers    | enum             | false    | 默认为`PNG`                                |
| tileFolder | string           | false    | 生成图片存放的文件夹，默认是`png`          |
| name       | string、Function | false    | 生成的图片名称                             |

```js
const rp = new RasterProcess();
await rp
  .use(new RasterProcess.task.ReadData())
  .use(
  new RasterProcess.task.GenerateJPEG(jpegPath, {
    clear: true,
  }),
)
  .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25-write-mercator.tiff')]);
```

#### UploadOSS

```
 region: string;
 accessKeyId: string;
 accessKeySecret: string;
 bucket: string;
 endpoint: string;
 secure: boolean;
 internal: boolean;
 cname: boolean;
 folder?: string;
 headers?: {
 [key: string]: any;
 };
 pathFunction?: (url: string, folder?: string) => string;
```

Options:


| Option          | Type     | Required | Desc                                                         |
| --------------- | -------- | -------- | ------------------------------------------------------------ |
| region          | string   | true     | Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou |
| accessKeyId     | string   | true     | 阿里云账号AccessKey拥有所有API的访问权限，风险很高。强烈建议您创建并使用RAM用户进行API访问或日常运维，请登录RAM控制台创建RAM用户 |
| accessKeySecret | string   | true     | 阿里云账号AccessKey拥有所有API的访问权限，风险很高。强烈建议您创建并使用RAM用户进行API访问或日常运维，请登录RAM控制台创建RAM用户 |
| bucket          | string   | true     | 存储桶名称                                                   |
| endpoint        | string   | false    | eg: oss-cn-hangzhou.aliyuncs.com                             |
| secure          | boolean  | false    | 是否启用 `https`                                             |
| internal        | boolean  | false    | 是否启用内网                                                 |
| cname           | boolean  | false    | 默认为false，使用自定义域名访问oss。如果为true，则可以使用自定义域名填充端点字段 |
| folder          | string   | false    | 存储目录                                                     |
| headers         | object   | false    | 请查看[ali-oss](https://www.npmjs.com/package/ali-oss)       |
| pathFunction    | function | false    | 文件存储路径                                                 |

```ts
const rp = new RasterProcess();
const res: any[] = await rp
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
    .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25-write-mercator.tiff')])
```

#### WriteMBTile

```
 region: string;
 accessKeyId: string;
 accessKeySecret: string;
 bucket: string;
 endpoint: string;
 secure: boolean;
 internal: boolean;
 cname: boolean;
 folder?: string;
 headers?: {
 [key: string]: any;
 };
 pathFunction?: (url: string, folder?: string) => string;
```

Options:

| Option | Type | Required | Desc      |
| ------ | ---- | -------- | --------- |
| mode   | enum | true     | Mode type |


```js
const rp = new RasterProcess();
await rp
  .use(new RasterProcess.task.ReadData())
  .use(
  new RasterProcess.task.GenerateTiles(tilesPath, {
    clear: true,
    gray: true,
    writeExif: true,
    zooms: [0, 1, 1]
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
  .run([path.resolve(__dirname, './fixtures/gfs.t12z.pgrb2.0p25-write-mercator.tiff')])
```

