import { IsInt } from 'class-validator';

export class StartAttemptDto {
  @IsInt()
  examId!: number;
}
