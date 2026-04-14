export interface VatReturn {
  id: string;
  month: string;
  companyName: string;
  pan: string;
  filename: string;
  taxableSales: number;
  nonTaxableSales: number;
  vatOnSales: number;
  taxableImport: number;
  taxablePurchase: number;
  vatOnTaxableImport: number;
  vatOnTaxablePurchase: number;
  exemptPurchase: number;
  exemptImport: number;
  grossVatPayable: number;
  previousMonthCredit: number;
  netVatPayable: number;
  numSalesInvoice: number;
  numCreditNote: number;
  numPurchaseInvoice: number;
  numDebitNote: number;
  numCreditAdvice: number;
  dateAdded: string;
}
