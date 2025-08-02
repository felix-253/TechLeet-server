export class ObjectConverter {
   static toOutput(input: Record<string, any>, output: Record<string, any>): any {
      const result: any = {};
      for (const key in output) {
         if (output.hasOwnProperty(key) && input.hasOwnProperty(key)) {
            result[key] = input[key];
         }
      }
      return result;
   }
}
    