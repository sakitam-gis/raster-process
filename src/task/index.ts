import ReadData from './ReadData';
import WriteTiff from './WriteTiff';
import Reproject from './Reproject';
import GenerateTiles from './GenerateTiles';
import GenerateJPEG from './GenerateJPEG';

export type ITask = ReadData | WriteTiff | Reproject | GenerateTiles | GenerateJPEG;

export { ReadData, WriteTiff, Reproject, GenerateTiles, GenerateJPEG };
