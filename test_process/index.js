const RasterProcess =  require('../');
const path = require('path');

function run () {
  const rp = new RasterProcess.default();

  const dataPath = path.resolve(__dirname, '../test/fixtures/gfs.t00z.pgrb2.0p25.f000');
  const tiffPath = path.resolve(__dirname, './data/result/gfs.t12z.pgrb2.0p25.tiff');
  const mercatorTiffPath = path.resolve(__dirname, './data/result/gfs.t12z.pgrb2.0p25-write-mercator.tiff');

  const tempPath = path.resolve(__dirname, './data/result/tiles');
  const jpegPath = path.resolve(__dirname, './data/result');

  rp
    .use(
      new RasterProcess.default.task.ReadData(),
    )
    .use(
      new RasterProcess.default.task.WriteTiff(tiffPath, {
        clear: true,
        gray: false,
        bandsFunction: (info) => {
          const t = info.GRIB_PDS_TEMPLATE_ASSEMBLED_VALUES.split(' ');
          if (info.GRIB_ELEMENT === 'TMP' && t[11] === '100000') {
            return {
              name: 'TMP',
              label: '温度',
              process: (v) => RasterProcess.default.normalizeDataProcess.subScalar(v, 0),
            };
          }
          return false;
        },
        customProj4: '+proj=longlat +datum=WGS84 +no_defs +type=crs', // 4326
        customExtent: [-180, -85.05112877980659, 180, 85.05112877980659],
      }),
    )
    .use(
      new RasterProcess.default.task.Reproject(mercatorTiffPath, {
        width: 1024,
        height: 1024,
        clear: true,
      }),
    )
    .use(
      new RasterProcess.default.task.GenerateTiles(tempPath, {
        clear: true,
        gray: true,
        writeExif: true,
        zooms: [0, 1, 1]
      }),
    )
    .use(
      new RasterProcess.default.task.GenerateJPEG(jpegPath, {
        clear: true,
      }),
    )
    // .use(
    //   new RasterProcess.default.task.GeneratePNG(jpegPath, {
    //     clear: true,
    //   }),
    // )
    .run([dataPath], (res) => {
      console.log(res);
    });
}

run();
