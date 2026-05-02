import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { InvoiceDocument, type InvoiceDocumentProps } from '@/components/invoice-pdf/invoice-document';

export async function renderInvoicePdf(
  props: InvoiceDocumentProps,
): Promise<Buffer> {
  return renderToBuffer(createElement(InvoiceDocument, props));
}
