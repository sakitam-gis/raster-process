import MBTiles from '@mapbox/mbtiles';
import fs from 'fs-extra';
import { safePush } from '../utils';

export interface IMBTileConfig {
  mode: 'ro' | 'rw' | 'rwc';
}

class WriteMBTile {
  public id: string;
  public config: IMBTileConfig;

  private ctx: any;

  private mbtiles: typeof MBTiles;

  constructor(sourceUri: string, config: IMBTileConfig) {
    this.id = 'WriteMBTileTask';

    this.config = config;

    fs.ensureFileSync(sourceUri);

    this.mbtiles = new MBTiles(`${sourceUri}?mode=${this.config.mode}`, (err) => {
      if (err) {
        this.ctx.logger.error(`[${this.id}]: ${err.toString()}`);
      } else {
        this.ctx.logger.info(`[${this.id}]: open mbtile success`);
      }
    });
  }

  putTile(x: number, y: number, z: number, url): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const buffer = fs.readFileSync(url);
      this.mbtiles.putTile(x, y, z, buffer, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  startWriting() {
    return new Promise((resolve, reject) => {
      this.mbtiles.startWriting((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  stopWriting() {
    return new Promise((resolve, reject) => {
      this.mbtiles.stopWriting((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async run(data) {
    try {
      const res: any = {
        path: data[0],
        data: data[1],
      };

      const errorTiles: {
        key: string;
        value: string;
      }[] = [];

      const state = await this.startWriting();
      if (state) {
        if (Array.isArray(data[0]) && data[1] instanceof Map) {
          const tiles = Array.from(data[1], ([key, value]) => ({ key, value }));
          for (let i = 0; i < tiles.length; i++) {
            const { key, value } = tiles[i];
            const [_, z, x, y] = key.split('-');
            const r = await this.putTile(x, y, z, value);
            if (!r) {
              errorTiles.push({
                key,
                value,
              });
            }
          }
        } else {
          const d = await this.putTile(0, 0, 0, data[0]);
          if (!d) {
            errorTiles.push({
              key: data[0],
              value: data[1],
            });
          }
        }
        await this.stopWriting();
      }

      return [
        res.path,
        res.data,
        safePush(data[2], {
          errorTiles,
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

export default WriteMBTile;
