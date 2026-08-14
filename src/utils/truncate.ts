export const truncate = (str: string, max = 30) =>
  str.length > max ? `${str.slice(0, max).trim()}…` : str;