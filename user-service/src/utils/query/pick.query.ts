import { SelectQueryBuilder } from 'typeorm';

export function pickMapper<T, K extends keyof T>(
   obj: T extends object ? T : never,
   keys: K[],
): Pick<T, K> {
   return keys.reduce(
      (acc, key) => {
         if (key in obj) {
            acc[key] = obj[key];
         }
         return acc;
      },
      {} as Pick<T, K>,
   );
}

export const deleteCondition = (qb, alias, includeDeleted = false) => {
   if (!includeDeleted) {
      qb.andWhere(`${alias}.deletedAt IS NULL`);
   }
};
