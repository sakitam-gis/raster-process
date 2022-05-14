import ReadData from './ReadData';
import WriteTiff from './WriteTiff';
import Reproject from './Reproject';

export type ITask = ReadData | WriteTiff | Reproject;

export {
  ReadData,
  WriteTiff,
  Reproject,
}
