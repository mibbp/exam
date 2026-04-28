import { IsString } from 'class-validator';

export class SaveAnswerDto {
  @IsString()
  answer!: string;
}
