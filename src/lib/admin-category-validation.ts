export function isCategorySelected<T extends string>(category: T): category is Exclude<T, ""> {
  return category.trim().length > 0;
}
