// utils/pdfGenerator.ts

import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true, // Enable headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0',
  });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' },
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
}
