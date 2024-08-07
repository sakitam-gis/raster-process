import type { UnsetAdditionalOptions } from 'tapable';
import { AsyncSeriesWaterfallHook } from 'tapable';
import { merge, isFunction } from 'lodash';
import pino from 'pino';
import fs from 'fs-extra';
import path from 'path';
import type { Dataset } from 'gdal-async';
import * as task from './task';
import * as normalizeDataProcess from './process/normalizeData';
import type { BaseLogger } from 'pino';
import type { IConfig } from './config';
import type { IRItem } from './utils';
import type { ITask } from './task';

const defaultConfig: IConfig = {
  name: 'raster-process',
  log: {
    options: {},
    destination: '',
  },
  workspace: process.cwd(),
};

type IDataPath = string | string[];
type IDataRes = Dataset | string[] | Map<string, string>;

export type ITaskResult = [IDataPath, IDataRes, IRItem[]];

class RasterProcess {
  public static task = task;
  public static normalizeDataProcess = normalizeDataProcess;
  public logger: BaseLogger;
  public config: IConfig & Partial<IConfig>;
  private task: AsyncSeriesWaterfallHook<string, UnsetAdditionalOptions>;

  constructor(config?: Partial<IConfig>) {
    this.config = merge({}, defaultConfig, config || {});

    this.createLogger();

    this.task = new AsyncSeriesWaterfallHook<string>(['arg1']);

    this.task.intercept({
      register: (tapInfo) => {
        this.logger.info(`${tapInfo.name} is register`);
        return tapInfo;
      },
    });
  }

  createLogger() {
    const data = new Date();
    const destination = `./logs/{name}-${data.getFullYear()}-${data.getMonth() + 1}-${data.getDate()}.log`.replace(
      '{name}',
      this.config.name,
    );

    const targetLog = path.resolve(this.config.workspace, <string>this.config.log?.destination || destination);

    fs.ensureFileSync(targetLog);

    this.logger = pino(this.config.log?.options || {}, pino.destination(targetLog));
  }

  use(t: ITask) {
    t.apply(this);
    return this;
  }

  run(pathSrc: string[], cb?: (err: any, res: ITaskResult) => void) {
    return new Promise((resolve, reject) => {
      this.task.callAsync(pathSrc as any, (err, res: any) => {
        if (err) {
          this.logger.error('task fail', err);
          reject(err);
        } else {
          this.logger.info('all task done');
          resolve(res);
        }
        if (isFunction(cb)) {
          cb(err, res);
        }
      });
    });
  }
}

export { RasterProcess, defaultConfig, task, normalizeDataProcess };
