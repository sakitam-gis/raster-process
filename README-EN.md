## raster-process

[![CI](https://github.com/sakitam-gis/raster-process/actions/workflows/ci.yml/badge.svg)](https://github.com/sakitam-gis/raster-process/actions/workflows/ci.yml) [![npm version](https://badgen.net/npm/v/@sakitam-gis/raster-process)](https://npm.im/@sakitam-gis/raster-process) [![npm downloads](https://badgen.net/npm/dm/@sakitam-gis/raster-process)](https://npm.im/@sakitam-gis/raster-process) [![Coverage Status](https://coveralls.io/repos/github/sakitam-gis/raster-process/badge.svg?branch=master)](https://coveralls.io/github/sakitam-gis/raster-process?branch=master)

A raster data process utilities.

### Install

```bash
npm i @sakitam-gis/raster-process -S

import { RasterProcess } from '@sakitam-gis/raster-process'
```

### Use

```ts
const process = new RasterProcess();
process.use(task).use(task);
```

### process `GFS` grib data

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

### Task List
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

### Examples

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
| clear         | boolean  | false    | Whether to automatically clear exit tiff file，default is false |
| width         | number   | false    | default is dataset width                                     |
| height        | number   | false    | default is dataset height                                    |
| dataType      | enum     | false    | Write the data type of TIFF. The default is GDT_ Float32     |
| bandCount     | number   | false    | The number of channels of data written to tiff. The default is the number of channels of original taster data |
| bandsFunction | Function | false    | Whether to filter the channels of original data. By default, all channels will return `true`. You can configure this item to filter which channels you need to write to TIFF data |
| gray          | boolean  | false    | Convert to grayscale data                                    |
| drivers       | enum     | false    | default is `GTiff`                                           |
| customProj4   | string   | false    | Custom data projection, read from original data by default   |
| customExtent  | number[] | false    | Custom data extent, read from metadata by default            |

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
| clear             | boolean  | false    | Whether to customize the data after clearing the existing reprojection data. The default is false |
| width             | number   | false    | default is `256`                                             |
| height            | number   | false    | default is`256`                                              |
| dataType          | enum     | false    | The projected dataset data type,  default is `GDT_ Float32`  |
| bandCount         | number   | false    | The number of channels of data written to the dataset. The default is the number of channels of original raster data |
| drivers           | enum     | false    | default is `GTiff`                                           |
| resampling        | enum     | false    | Resampling method of re projection, the default is`GRA_NearestNeighbor` |
| sourceProj4       | string   | false    | Manually specify source data projection, and read from source data by default |
| sourceExtent      | number[] | false    | Manually specify the source data range, and read from the source data by default |
| withMetadata      | boolean  | false    | Synchronize metadata                                         |
| destinationProj4  | string   | false    | Manually specify the target projection, and the default is the Mercator proj4 definition string |
| destinationExtent | number[] | false    | Manually specify the target data range. By default, it is converted from the source data range according to the target projection |
| threads           | number   | false    | Number of threads used by reprojection，default use `os.cpus().length` |
| others            |          |          | For other configuration items, please refer to the `reprojectimage`configuration item in the `gdal-async` document |

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
| clear            | boolean          | false    | Whether to automatically clear the existing tile data and projection cache data. The default is false |
| tileSize         | number           | false    | Tile size: default is`256`                                   |
| dataType         | enum             | false    | The dataset data type for generating tiles. The default is GDT_ Float32 |
| bandCount        | number           | false    | The number of channels to write data to the dataset. The default is `1` |
| drivers          | enum             | false    | The default is`GTiff`                                        |
| gray             | boolean          | false    | Convert to grayscale                                         |
| writeExif        | boolean          | false    | Whether to write EXIF information                            |
| clipExtent       | boolean          | false    | When the Mercator tile is generated, if the projection range of the tile exceeds the projection range specified by the Mercator, it will be automatically trimmed |
| bandName         | string、Function | false    | Specifies the channel name of grid data, which is very useful when processing `GFS` weather data |
| tileFolder       | string           | false    | The folder where tiles are generated. The default is`tiles`  |
| cacheFolder      | string           | false    | During the production of tiles, we need to re project the original data of each level, but we do not need to generate it every time. We can cache it through the file after each generation. This configuration specifies the cache location. Of course, we can also configure `clear = true` not to cache. This configuration item defaults to`cache` |
| cacheFilePrefix  | string           | false    | Cache file name prefix. This configuration item defaults to`mercator` |
| tileProj4        | string           | false    | The configuration of the re projection tiles at each level is Mercator by default `proj4`string |
| tileExtent       | number[]         | false    | The configuration of each level of re projection tiles is the global scope of Mercator by default |
| reprojectOptions | object           | false    | For the re projection configuration of the re projection tiles at each level, please refer to the configuration item of `Reproject` |
| enlargeOptions   | object           | false    | Re projection tile expansion configuration at each level     |

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

| Option     | Type             | Required | Desc                                                         |
| ---------- | ---------------- | -------- | ------------------------------------------------------------ |
| clear      | boolean          | false    | Whether to automatically clear the existing tile data, the default is false |
| quality    | number           | false    | Picture quality, default is `90`                             |
| drivers    | enum             | false    | Default is JPEG`                                             |
| tileFolder | string           | false    | Generate a folder for storing pictures. The default is`jpeg` |
| name       | string、Function | false    | Generated picture name                                       |

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

| Option     | Type             | Required | Desc                                                         |
| ---------- | ---------------- | -------- | ------------------------------------------------------------ |
| clear      | boolean          | false    | Whether to automatically clear the existing tile data, the default is false |
| quality    | number           | false    | Picture quality, default is `90`                             |
| drivers    | enum             | false    | Default is `PNG`                                             |
| tileFolder | string           | false    | Generate a folder for storing pictures. The default is`png`  |
| name       | string、Function | false    | Generated picture name                                       |

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
| region          | string   | true     | the bucket data region location, please see [Data Regions](https://www.npmjs.com/package/ali-oss#data-regions), default is `oss-cn-hangzhou`. |
| accessKeyId     | string   | true     | access key you create on aliyun console website              |
| accessKeySecret | string   | true     | access secret you create                                     |
| bucket          | string   | true     | the default bucket you want to access If you don't have any bucket, please use `putBucket()` create one first. |
| endpoint        | string   | false    | oss region domain. It takes priority over `region`. Set as extranet domain name, intranet domain name, accelerated domain name, etc. according to different needs. please see [endpoints](https://www.alibabacloud.com/help/doc-detail/31837.htm) |
| secure          | boolean  | false    | instruct OSS client to use HTTPS (secure: true) or HTTP (secure: false) protocol. |
| internal        | boolean  | false    | ccess OSS with aliyun internal network or not, default is `false`. If your servers are running on aliyun too, you can set `true` to save lot of money. |
| cname           | boolean  | false    | default false, access oss with custom domain name. if true, you can fill `endpoint` field with your custom domain name, |
| folder          | string   | false    | Storage directory                                            |
| headers         | object   | false    | see [ali-oss](https://www.npmjs.com/package/ali-oss)         |
| pathFunction    | function | false    | File storage path                                            |


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


