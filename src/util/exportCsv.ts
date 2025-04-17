import { Parser } from 'json2csv';

export const exportToCSV = (data: any[]): string => {
  const fields = Object.keys(data[0] || {});
  const opts = { fields };

  try {
    const parser = new Parser(opts);
    const csv = parser.parse(data);
    return csv;
  } catch (error) {
    console.error('Failed to export to CSV:', error);
    throw new Error('Failed to export to CSV');
  }
};