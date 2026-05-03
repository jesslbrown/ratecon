/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer's Image
   component is not the DOM <img>; it has no alt prop. */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { Currency } from '@/lib/supabase/database.types';

export interface InvoiceLineItem {
  description: string;
  amount: number;
}

export interface InvoiceDocumentProps {
  carrier: {
    company_name: string;
    logoUrl?: string | null;
    mc_number: string | null;
    gst_hst_number: string | null;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    province: string;
    postal_code: string;
    country: string;
    phone: string;
    email?: string | null;
  };
  broker: {
    name: string;
    address_line1?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
    country?: string | null;
  };
  invoice: {
    number: string;
    issue_date: string;
    due_date: string;
    load_number: string | null;
  };
  lineItems: InvoiceLineItem[];
  totals: {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    currency: Currency;
  };
  attachments?: { kind: 'BOL' | 'POD'; url: string }[];
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  logo: { width: 56, height: 56 },
  companyName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  small: { color: '#555' },
  invoiceMeta: { textAlign: 'right' },
  invoiceTitle: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 2 },
  metaLabel: { color: '#555' },
  block: { marginBottom: 16 },
  blockTitle: { textTransform: 'uppercase', color: '#888', fontSize: 9, marginBottom: 4 },
  table: { marginTop: 16, marginBottom: 16, borderTop: 1, borderColor: '#e5e7eb' },
  row: { flexDirection: 'row', borderBottom: 1, borderColor: '#e5e7eb', paddingVertical: 6 },
  cellDesc: { flex: 4 },
  cellAmount: { flex: 1, textAlign: 'right' },
  totalsBlock: { marginLeft: 'auto', width: '50%' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTop: 1,
    borderColor: '#111',
    fontWeight: 700,
    fontSize: 12,
  },
  footer: { marginTop: 24, padding: 12, backgroundColor: '#f3f4f6', fontSize: 9 },
  attachmentLink: { color: '#1d4ed8', textDecoration: 'underline' },
});

function formatMoney(n: number, currency: Currency) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

export function InvoiceDocument(props: InvoiceDocumentProps) {
  const { carrier, broker, invoice, lineItems, totals, attachments } = props;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {carrier.logoUrl ? <Image src={carrier.logoUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.companyName}>{carrier.company_name}</Text>
              <Text style={styles.small}>{carrier.address_line1}</Text>
              {carrier.address_line2 ? (
                <Text style={styles.small}>{carrier.address_line2}</Text>
              ) : null}
              <Text style={styles.small}>
                {carrier.city}, {carrier.province} {carrier.postal_code}
              </Text>
              <Text style={styles.small}>{carrier.country}</Text>
              <Text style={styles.small}>{carrier.phone}</Text>
              {carrier.mc_number ? (
                <Text style={styles.small}>MC#: {carrier.mc_number}</Text>
              ) : null}
              {carrier.gst_hst_number ? (
                <Text style={styles.small}>GST/HST#: {carrier.gst_hst_number}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Number</Text>
              <Text>{invoice.number}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue date</Text>
              <Text>{invoice.issue_date}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due date</Text>
              <Text>{invoice.due_date}</Text>
            </View>
            {invoice.load_number ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Load</Text>
                <Text>{invoice.load_number}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Bill to</Text>
          <Text>{broker.name}</Text>
          {broker.address_line1 ? <Text>{broker.address_line1}</Text> : null}
          {broker.city || broker.province || broker.postal_code ? (
            <Text>
              {[broker.city, broker.province, broker.postal_code].filter(Boolean).join(', ')}
            </Text>
          ) : null}
          {broker.country ? <Text>{broker.country}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={[styles.row, { backgroundColor: '#f9fafb', fontWeight: 700 }]}>
            <Text style={styles.cellDesc}>Description</Text>
            <Text style={styles.cellAmount}>Amount</Text>
          </View>
          {lineItems.map((item, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.cellDesc}>{item.description}</Text>
              <Text style={styles.cellAmount}>
                {formatMoney(item.amount, totals.currency)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{formatMoney(totals.subtotal, totals.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>GST/HST ({(totals.taxRate * 100).toFixed(2)}%)</Text>
            <Text>{formatMoney(totals.taxAmount, totals.currency)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text>Total</Text>
            <Text>{formatMoney(totals.total, totals.currency)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Please remit payment within {invoice.due_date} to {carrier.company_name}.
          </Text>
          <Text>
            Mailing address: {carrier.address_line1}, {carrier.city}, {carrier.province}{' '}
            {carrier.postal_code}.
          </Text>
          {attachments && attachments.length > 0 ? (
            <Text>
              Supporting documents:{' '}
              {attachments.map((a, i) => (
                <Text key={i} style={styles.attachmentLink}>
                  {a.kind}
                  {i < attachments.length - 1 ? ', ' : ''}
                </Text>
              ))}
            </Text>
          ) : null}
        </View>
      </Page>

      {attachments?.map((a) => (
        <Page key={a.url} size="LETTER" style={styles.page}>
          <Text style={styles.invoiceTitle}>{a.kind}</Text>
          <Image src={a.url} />
        </Page>
      ))}
    </Document>
  );
}
