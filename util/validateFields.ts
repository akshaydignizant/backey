export const validateFields = (fields: Record<string, any>) => {
  return Object.entries(fields).find(([key, value]) => !value) ? false : true;
};