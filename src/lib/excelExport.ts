import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { VatReturn } from "@/types";

export async function exportToExcel(returns: VatReturn[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('VAT Returns');

  // Group returns by PAN
  const groupedReturns = returns.reduce((acc, r) => {
    const key = r.pan;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {} as Record<string, VatReturn[]>);

  let currentRow = 1;

  Object.entries(groupedReturns).forEach(([pan, companyReturns], index) => {
    const companyName = companyReturns[0].companyName;

    // Add some spacing between companies if not the first one
    if (index > 0) {
      currentRow += 2;
    }

    // Company Name Row
    const nameRow = worksheet.getRow(currentRow);
    nameRow.getCell(1).value = "Company Name";
    nameRow.getCell(2).value = companyName;
    nameRow.getCell(1).font = { bold: true, size: 12 };
    nameRow.getCell(2).font = { bold: true, size: 12 };
    currentRow++;

    // PAN Row
    const panRow = worksheet.getRow(currentRow);
    panRow.getCell(1).value = "PAN";
    panRow.getCell(2).value = pan;
    panRow.getCell(1).font = { bold: true, size: 12 };
    panRow.getCell(2).font = { bold: true, size: 12 };
    currentRow += 2; // One empty row after PAN

    // Table Header
    const headers = [
      "Month", "Taxable Sales", "Non-Taxable Sales", "VAT on Sales", "Taxable Import",
      "Taxable Purchase", "VAT on Taxable Import", "VAT on Taxable Purchase",
      "Exempt Purchase", "Exempt Import", "Gross VAT Payable", "Previous Month Credit",
      "Net VAT Payable", "Sales Invoices", "Credit Notes", "Purchase Invoices",
      "Debit Notes", "Credit Advice", "Filename", "Submission Number", "Verification Date"
    ];

    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 30;
    currentRow++;

    const startDataRow = currentRow;

    // Data Rows
    companyReturns.forEach(r => {
      const row = worksheet.getRow(currentRow);
      const values = [
        r.month, r.taxableSales, r.nonTaxableSales, r.vatOnSales, r.taxableImport,
        r.taxablePurchase, r.vatOnTaxableImport, r.vatOnTaxablePurchase,
        r.exemptPurchase, r.exemptImport, r.grossVatPayable, r.previousMonthCredit,
        r.netVatPayable, r.numSalesInvoice, r.numCreditNote, r.numPurchaseInvoice,
        r.numDebitNote, r.numCreditAdvice, r.filename, r.submissionNumber || "", r.verificationDate || ""
      ];

      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        // Format numbers
        if (typeof v === 'number' && i > 0 && i < 18) {
           cell.numFmt = '#,##0.00';
           cell.alignment = { horizontal: 'right' };
        } else {
           cell.alignment = { horizontal: i === 0 ? 'left' : 'left' };
        }
      });
      currentRow++;
    });

    const endDataRow = currentRow - 1;

    // Grand Total Row
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = "Grand Total";
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Columns to sum: 2 to 11, and 14 to 18
    const columnsToSum = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18];
    columnsToSum.forEach(colIdx => {
      const cell = totalRow.getCell(colIdx);
      const colLetter = worksheet.getColumn(colIdx).letter;
      cell.value = { formula: `SUM(${colLetter}${startDataRow}:${colLetter}${endDataRow})` };
      cell.font = { bold: true };
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add borders to the columns we didn't sum in the total row
    [12, 13, 19, 20, 21].forEach(colIdx => {
      const cell = totalRow.getCell(colIdx);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    currentRow++;
  });

  // Set column widths
  worksheet.columns.forEach((column, i) => {
    const idx = i + 1;
    if (idx === 1) column.width = 12; // Month
    else if (idx === 19) column.width = 45; // Filename
    else if (idx === 20 || idx === 21) column.width = 25; // Submission/Verification
    else column.width = 18; // Numeric columns
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "VAT_Returns_Summary.xlsx");
}

