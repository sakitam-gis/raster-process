import reproject from '../process/reproject';
import type { IReprojectOptions } from '../process/reproject';
import { safePush } from '../utils';

class Reproject {
  public id: string;
  public path: string;
  public options: any;

  private ctx: any;

  constructor(path: string, options: Partial<IReprojectOptions> = {}) {
    this.id = 'ReprojectTask';
    this.options = options;
    this.path = path;
  }

  async run(data, path, opt) {
    try {
      const res = await reproject(data, path, opt);
      return [
        res.path,
        res.data,
        safePush(data[2], {
          id: this.id,
          path: res.path,
          data: res.data,
          options: opt,
        }),
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }

  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data, this.path, this.options));
  }
}

export default Reproject;
