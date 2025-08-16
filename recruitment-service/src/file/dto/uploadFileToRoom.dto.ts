import { ApiProperty } from '@nestjs/swagger';

export class UploadFileToRoom {
   @ApiProperty({
      type: 'string',
      example: '213534dfg568',
   })
   roomId: string;
}
