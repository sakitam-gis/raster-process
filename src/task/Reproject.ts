import reproject from '../process/reproject';
import type { IReprojectOptions } from '../process/reproject';

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
      return reproject(data, path, opt);
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: `, e.toString());
    }
  }

  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data, this.path, this.options));
  }
}

export default Reproject;
