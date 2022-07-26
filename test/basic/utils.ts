export const sleep = (num: number) =>
  new Promise((res) => setTimeout(res, num));
