import generateJPEG from '../process/generateJPEG';
import type { IGenerateJPEGOptions } from '../process/generateJPEG';
import { safePush } from '../utils';

class GenerateJPEG {
  public id: string;
  public folder: string;
  public options: any;

  private ctx: any;

  constructor(folder: string, options: Partial<IGenerateJPEGOptions> = {}) {
    this.id = 'GenerateJPEGTask';
    this.folder = folder;
    this.options = options;
  }

  async run(data, folder, opt) {
    try {
      const res = await generateJPEG(data, folder, opt);
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

export default GenerateJPEG;
