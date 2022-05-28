import OSS from 'ali-oss';
import path from 'path';
import { omit, isArray, isFunction } from 'lodash';
import { safePush } from '../utils';

export interface IOSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint: string;
  secure: boolean;
  internal: boolean;
  cname: boolean;
  folder?: string;
  headers?: {
    [key: string]: any;
  };
  pathFunction?: (url: string, folder?: string) => string;
}

class UploadOSS {
  public id: string;
  public config: Partial<IOSSConfig>;

  private ctx: any;

  private client: typeof OSS;

  constructor(config: Partial<IOSSConfig>) {
    this.id = 'UploadOSSTask';

    this.config = config;

    this.client = new OSS({
      ...omit(config, ['headers', 'pathFunction', 'folder']),
    });
  }

  upload(uri: string) {
    let storeUrl = uri;
    if (isFunction(this.config.pathFunction)) {
      storeUrl = this.config.pathFunction(uri, this.config.folder);
    }
    return this.client.put(storeUrl, path.normalize(uri), {
      headers: this.config.headers,
    });
  }

  async run(data) {
    try {
      const res: any = {
        path: [],
        data: null,
      };

      if (isArray(data[0])) {
        const urls: {
          name: string;
          url: string;
          origin: string;
        }[] = [];
        for (let i = 0; i < data[0].length; i++) {
          const item = data[0][i];
          const d = await this.upload(item);
          urls.push({
            name: d.name,
            url: d.url,
            origin: item,
          });
        }
        res.path = urls.map((u) => u.url);
        res.data = urls;
      } else {
        const d = await this.upload(data[0]);
        res.path = d.url;
        res.data = {
          name: d.name,
          url: d.url,
          origin: data[0],
        };
      }

      return [
        res.path,
        res.data,
        safePush(data[2], {
          id: this.id,
          path: res.path,
          data: res.data,
          options: this.config,
        }),
      ];
    } catch (e) {
      this.ctx.logger.error(`[${this.id}]: ${e.toString()}`);
    }
  }

  apply(ctx) {
    this.ctx = ctx;
    ctx.task.tapPromise(this.id, (data) => this.run(data));
  }
}

export default UploadOSS;
