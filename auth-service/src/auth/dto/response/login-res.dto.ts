export interface LoginResDto {
   employeeId: number;
   email: string;
   fullName: string;
   phoneNumber: string;
   avatarUrl: string | null;
   token: string;
   refreshToken: string;
}
