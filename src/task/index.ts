import ReadData from './ReadData';
import WriteTiff from './WriteTiff';
import Reproject from './Reproject';
import GenerateTiles from './GenerateTiles';
import GenerateJPEG from './GenerateJPEG';
import GeneratePNG from './GeneratePNG';
import UploadOSS from './UploadOSS';
import WriteMBTile from './WriteMBTile';

export type ITask =
  | ReadData
  | WriteTiff
  | Reproject
  | GenerateTiles
  | GenerateJPEG
  | GeneratePNG
  | UploadOSS
  | WriteMBTile;

export {
  ReadData,
  WriteTiff,
  Reproject,
  GenerateTiles,
  GenerateJPEG,
  GeneratePNG,
  UploadOSS,
  WriteMBTile,
};
