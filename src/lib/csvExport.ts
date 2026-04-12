import Papa from "papaparse";
import { VatReturn } from "../types";

export function exportToCsv(data: VatReturn[]) {
  const csvData = data.map(item => ({
    "Month": item.month,
    "Filename": item.filename,
    "Taxable Sales": item.taxableSales,
    "Non-Taxable Sales": item.nonTaxableSales,
    "VAT on Sales": item.vatOnSales,
    "Taxable Import": item.taxableImport,
    "Taxable Purchase": item.taxablePurchase,
    "VAT on Taxable Import": item.vatOnTaxableImport,
    "VAT on Taxable Purchase": item.vatOnTaxablePurchase,
    "Exempt Purchase": item.exemptPurchase,
    "Exempt Import": item.exemptImport,
    "Gross VAT Payable": item.grossVatPayable,
    "Previous Month Credit": item.previousMonthCredit,
    "Net VAT Payable": item.netVatPayable,
    "Sales Invoices": item.numSalesInvoice,
    "Credit Notes": item.numCreditNote,
    "Purchase Invoices": item.numPurchaseInvoice,
    "Debit Notes": item.numDebitNote,
    "Credit Advices": item.numCreditAdvice,
    "Date Added": item.dateAdded
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `vat_returns_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
