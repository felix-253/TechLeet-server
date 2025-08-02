const approvalForSearch = [
   'employeeId',
   'email',
   'firstName',
   'lastName',
   'phoneNumber',
   'positionId',
   'departmentId',
] as const;
export type ApprovalForSearch = (typeof approvalForSearch)[];
