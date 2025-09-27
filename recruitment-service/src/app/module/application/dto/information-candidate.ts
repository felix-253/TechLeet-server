import { ApiProperty } from '@nestjs/swagger';

export class CreateInformationCandidateDto {
   @ApiProperty()
   jobPostingId: number;

   @ApiProperty()
   candidateId: number;

   @ApiProperty()
   pdfFilePath: string;
}
