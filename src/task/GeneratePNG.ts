import generatePNG from '../process/generatePNG';
import type { IGeneratePNGOptions } from '../process/generatePNG';
import { safePush } from '../utils';

class GeneratePNG {
  public id: string;
  public folder: string;
  public options: any;

  private ctx: any;

  constructor(folder: string, options: Partial<IGeneratePNGOptions> = {}) {
    this.id = 'GeneratePNGTask';
    this.folder = folder;
    this.options = options;
  }

  async run(data, folder, opt) {
    try {
      const res = await generatePNG(data, folder, opt);
      return [
        res.path,
        res.data,
        safePush(data[2], {
          id: this.id,
          path: res.path,
          data: res.data,
          options: this.options,
        }),
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }

  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data, this.folder, this.options));
  }
}

export default GeneratePNG;
