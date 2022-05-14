import writeTiff from '../process/writeTiff';
import type { IWriteOptions } from '../process/writeTiff';

class WriteTiff {
  public id: string;
  public path: string;
  public options: any;

  private ctx: any;

  constructor(path: string, options: Partial<IWriteOptions> = {}) {
    this.id = 'WriteTiffTask';
    this.path = path;
    this.options = options;
  }

  async run(data, path, opt) {
    try {
      return writeTiff(data, path, opt);
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: `, e.toString());
    }
  }

  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data, this.path, this.options));
  }
}

export default WriteTiff;
