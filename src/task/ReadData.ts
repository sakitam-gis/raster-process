import { openAsync } from 'gdal-async';
import type { Dataset } from 'gdal-async';
import { safePush } from '../utils';

export interface IReadDataOptions {
  autoClose: boolean;
}

export const defaultOptions = {
  autoClose: false,
};

class ReadData {
  public id: string;
  public options: IReadDataOptions;

  private ctx: any;

  constructor(options: Partial<IReadDataOptions> = {}) {
    this.id = 'ReadDataTask';
    this.options = {
      ...defaultOptions,
      ...options,
    };
  }

  async run(dataPath: string | Buffer, dst: Dataset, results) {
    try {
      const data = await openAsync(dataPath);
      process.nextTick(() => {
        if (this.options.autoClose) {
          data.close();
        }
      });
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
      console.error(`[${this.id}]: ${e.toString()}`);
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }

  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (res) => this.run(res[0], res[1], res[2]));
  }
}

export default ReadData;
