import ReadData from './ReadData';
import WriteTiff from './WriteTiff';
import Reproject from './Reproject';
import GenerateTiles from './GenerateTiles';

export type ITask = ReadData | WriteTiff | Reproject | GenerateTiles;

export { ReadData, WriteTiff, Reproject, GenerateTiles };
