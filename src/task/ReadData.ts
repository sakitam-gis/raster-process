import { openAsync } from 'gdal-async';

class ReadData {
  public id: string;
  public options: any;

  private ctx: any;

  constructor(options = {}) {
    this.id = 'ReadDataTask';
    this.options = options;
  }

  async run(dataPath: string | Buffer) {
    try {
      const ds = await openAsync(dataPath);
      return ds;
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: `, e.toString());
    }
  }

  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (dataPath) => this.run(dataPath));
  }
}

export default ReadData;
