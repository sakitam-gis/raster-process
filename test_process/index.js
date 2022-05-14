const RasterProcess =  require('../');
const path = require('path');

function run () {
  const rp = new RasterProcess.default();

  const dataPath = path.resolve(__dirname, './data/gfs.t12z.pgrb2.0p25.grib');
  const tiffPath = path.resolve(__dirname, './data/result/gfs.t12z.pgrb2.0p25.tiff');
  const mercatorTiffPath = path.resolve(__dirname, './data/result/gfs.t12z.pgrb2.0p25-write-mercator.tiff');

  const tempPath = path.resolve(__dirname, './data/result/gfs.t12z.pgrb2.0p25-write.tiff');

  rp
    .use(
      new RasterProcess.default.task.ReadData(),
    )
    .use(
      new RasterProcess.default.task.WriteTiff(tiffPath, {
        clear: true,
      }),
    )
    .use(
      new RasterProcess.default.task.Reproject(mercatorTiffPath, {
        width: 1024,
        height: 1024,
        clear: true,
      }),
    )
    // .use(
    //   new RasterProcess.default.task.ReadData(),
    // )
    // .use(
    //   new RasterProcess.default.task.WriteTiff(tempPath, {
    //     clear: true,
    //   }),
    // )
    .run(dataPath);
}

run();
