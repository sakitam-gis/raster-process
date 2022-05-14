import { AsyncSeriesWaterfallHook, UnsetAdditionalOptions } from 'tapable';
import { merge } from 'lodash';
import pino from 'pino';
import fs from 'fs-extra';
import path from 'path';
import * as task from './task';
import type { BaseLogger } from 'pino';
import type { IConfig } from './config';
import type { ITask } from './task';

const defaultConfig: IConfig = {
  name: 'raster-process',
  log: {
    options: {},
    destination: '',
  },
  workspace: process.cwd(),
};

class RasterProcess {
  public static task = task;
  public logger: BaseLogger;
  public config: IConfig & Partial<IConfig>;
  private task: AsyncSeriesWaterfallHook<string, UnsetAdditionalOptions>;

  constructor(config: Partial<IConfig>) {
    this.config = merge(defaultConfig, config);

    this.createLogger();

    this.task = new AsyncSeriesWaterfallHook<string>(['arg1']);

    this.task.intercept({
      register: (tapInfo) => {
        this.logger.info(`${tapInfo.name} is register`);
        return tapInfo;
      },
      tap: (tap) => {
        console.log(tap.name, 'tap');
      },
    });
  }

  createLogger() {
    const data = new Date();
    const destination = `./logs/{name}-${data.getFullYear()}-${data.getMonth() + 1}-${data.getDate()}.log`.replace('{name}', this.config.name);

    const targetLog = path.resolve(this.config.workspace, <string>this.config.log?.destination || destination);

    fs.ensureFileSync(targetLog);

    this.logger = pino(this.config.log?.options || {}, pino.destination(targetLog));
  }

  use(task: ITask) {
    task.apply(this);
    return this;
  }

  run(pathSrc) {
    this.task.callAsync(pathSrc, () => {
      this.logger.info('all task done');
    });
  }
}

export default RasterProcess;
