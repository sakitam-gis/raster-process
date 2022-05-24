import ReadData from './ReadData';
import WriteTiff from './WriteTiff';
import Reproject from './Reproject';
import GenerateTiles from './GenerateTiles';
import GenerateJPEG from './GenerateJPEG';
import GeneratePNG from './GeneratePNG';

export type ITask = ReadData | WriteTiff | Reproject | GenerateTiles | GenerateJPEG | GeneratePNG;

export { ReadData, WriteTiff, Reproject, GenerateTiles, GenerateJPEG, GeneratePNG };
