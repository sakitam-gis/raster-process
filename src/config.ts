import { LoggerOptions, DestinationStream } from 'pino';
import { SonicBoomOpts } from 'sonic-boom';

export interface IConfig {
  name: string;
  log: {
    options: LoggerOptions;
    destination: string | number | SonicBoomOpts | DestinationStream | NodeJS.WritableStream;
  };
  workspace: string;
}

export const extent = [-180, -90, 180, 90];
export const mercatorLngLatExtent = [-180, -85.05112877980659, 180, 85.05112877980659];
export const mercatorExtent = [
  -20037508.342789244, -20037508.342789255, 20037508.342789244, 20037508.342789244,
];
