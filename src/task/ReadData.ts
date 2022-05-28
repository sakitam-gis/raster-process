import { openAsync } from 'gdal-async';
import type { Dataset } from 'gdal-async';
import { safePush } from '../utils';

class ReadData {
  public id: string;
  public options: any;

  private ctx: any;

  constructor(options = {}) {
    this.id = 'ReadDataTask';
    this.options = options;
  }

  async run(dataPath: string | Buffer, dst: Dataset, results) {
    try {
      const data = await openAsync(dataPath);
      return [
        dataPath,
        data,
        safePush(results, {
          id: this.id,
          path: dataPath,
          data: data,
          options: this.options,
        }),
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }

  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (res) => this.run(res[0], res[1], res[2]));
  }
}

export default ReadData;
