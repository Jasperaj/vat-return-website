import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VatReturn } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Trash2, Eye, FileText, CheckCircle2, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { translations, Language } from "@/lib/translations";

interface VatTableProps {
  data: VatReturn[];
  onDelete: (id: string) => void;
  onRecheck?: (id: string) => void;
  lang: Language;
}

export function VatTable({ data, onDelete, onRecheck, lang }: VatTableProps) {
  const t = translations[lang];

  const checkVatCalculation = (item: VatReturn) => {
    // 1. VAT on Sales check (13%)
    const expectedSalesVat = item.taxableSales * 0.13;
    const salesVatMatch = Math.abs(expectedSalesVat - item.vatOnSales) < 5.0; // wider margin for potential rounding in large amounts

    // 2. VAT on Purchase/Import check (13%)
    const expectedPurchaseVat = item.taxablePurchase * 0.13;
    const expectedImportVat = item.taxableImport * 0.13;
    const purchaseVatMatch = Math.abs(expectedPurchaseVat - item.vatOnTaxablePurchase) < 5.0;
    const importVatMatch = Math.abs(expectedImportVat - item.vatOnTaxableImport) < 5.0;

    // 3. Overall Net VAT check
    // Gross VAT = Sales VAT - (Purchase VAT + Import VAT)
    const expectedGross = item.vatOnSales - (item.vatOnTaxablePurchase + item.vatOnTaxableImport);
    // Net VAT = Gross VAT - Previous Month Credit
    const expectedNet = expectedGross - item.previousMonthCredit;
    
    // Check with 1.0 margin for rounding
    const overallMatch = Math.abs(expectedNet - item.netVatPayable) < 1.0;

    const isMatch = salesVatMatch && purchaseVatMatch && importVatMatch && overallMatch;

    return { 
      isMatch, 
      expectedNet, 
      expectedGross,
      details: {
        salesVatMatch, expectedSalesVat, actualSalesVat: item.vatOnSales,
        purchaseVatMatch, expectedPurchaseVat, actualPurchaseVat: item.vatOnTaxablePurchase,
        importVatMatch, expectedImportVat, actualImportVat: item.vatOnTaxableImport,
        overallMatch
      }
    };
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">{t.noReturns}</p>
          <p className="text-xs text-muted-foreground/70">{t.noReturnsSubtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[120px] font-bold text-foreground">{t.month}</TableHead>
              <TableHead className="font-bold text-foreground">{t.filename}</TableHead>
              <TableHead className="text-right font-bold text-foreground">{t.taxableSales}</TableHead>
              <TableHead className="text-right font-bold text-foreground text-blue-600">{t.vatOnSales}</TableHead>
              <TableHead className="text-right font-bold text-foreground">{t.taxablePurchase}</TableHead>
              <TableHead className="text-right font-bold text-foreground text-blue-600">{t.vatOnPurchaseImport}</TableHead>
              <TableHead className="text-right font-bold text-foreground">{t.netVatPayable}</TableHead>
              <TableHead className="text-center font-bold text-foreground w-[100px]">{t.calculationStatus}</TableHead>
              <TableHead className="text-right font-bold text-foreground">{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => {
              const { isMatch, expectedNet, details } = checkVatCalculation(item);
              return (
                <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <Badge variant="secondary" className="font-mono px-2 py-0.5">{item.month}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium" title={item.filename}>
                    {item.filename}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.taxableSales.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-blue-600">
                    {item.vatOnSales.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.taxablePurchase.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-blue-600">
                    {(item.vatOnTaxablePurchase + item.vatOnTaxableImport).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">
                    {item.netVatPayable.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger 
                        render={
                          <div className="flex justify-center cursor-help">
                            {isMatch ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            )}
                          </div>
                        }
                      />
                      <TooltipContent className="p-3 space-y-1 w-64">
                        <p className="font-bold text-xs border-b pb-1 mb-1">
                          {isMatch ? t.calculationMatch : t.calculationMismatch}
                        </p>
                        <div className="text-[10px] space-y-2">
                          <div className="border-b pb-1">
                            <p className="font-semibold mb-1">VAT on Sales (13%)</p>
                            <div className="flex justify-between gap-4 text-muted-foreground">
                              <span>{t.expected}:</span>
                              <span className="font-mono text-foreground">Rs. {Math.round(details.expectedSalesVat).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-muted-foreground">
                              <span>{t.actual}:</span>
                              <span className={`font-mono ${details.salesVatMatch ? 'text-green-600' : 'text-amber-600 font-bold'}`}>Rs. {details.actualSalesVat.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="border-b pb-1">
                            <p className="font-semibold mb-1">VAT on Purchase/Import (13%)</p>
                            <div className="flex justify-between gap-4 text-muted-foreground">
                              <span>{t.expected}:</span>
                              <span className="font-mono text-foreground">Rs. {Math.round(details.expectedPurchaseVat + details.expectedImportVat).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-muted-foreground">
                              <span>{t.actual}:</span>
                              <span className={`font-mono ${details.purchaseVatMatch && details.importVatMatch ? 'text-green-600' : 'text-amber-600 font-bold'}`}>Rs. {(details.actualPurchaseVat + details.actualImportVat).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="pt-1">
                            <p className="font-semibold mb-1">{t.netVatPayable}</p>
                            <div className="flex justify-between gap-4 text-muted-foreground">
                              <span>{t.expected}:</span>
                              <span className="font-mono text-foreground">Rs. {Math.round(expectedNet).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-muted-foreground">
                              <span>{t.actual}:</span>
                              <span className={`font-mono ${details.overallMatch ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}`}>Rs. {item.netVatPayable.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        {!isMatch && (
                          <div className="mt-2 pt-2 border-t border-amber-200/50">
                            <p className="text-[9px] text-amber-700 italic leading-tight">
                              {t.recheckNote}
                            </p>
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!isMatch && (
                      <Tooltip>
                        <TooltipTrigger 
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRecheck?.(item.id)}
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <TooltipContent>
                          <p>{t.recheckWithPro}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Dialog>
                      <DialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}>
                        <Eye className="h-4 w-4" />
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            {t.details} - {item.month}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                          <div className="space-y-4 md:col-span-2">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">{t.title} Information</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                                <span className="text-xs text-muted-foreground">{t.submissionNumber}</span>
                                <span className="text-sm font-mono font-bold">{item.submissionNumber || "N/A"}</span>
                              </div>
                              <div className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                                <span className="text-xs text-muted-foreground">{t.verificationDate}</span>
                                <span className="text-sm font-mono font-bold">{item.verificationDate || "N/A"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">{t.salesSummary}</h4>
                            <DetailRow label={t.taxableSales} value={item.taxableSales} />
                            <DetailRow label={t.nonTaxableSales} value={item.nonTaxableSales} />
                            <DetailRow label={t.vatOnSales} value={item.vatOnSales} isVat />
                            <DetailRow label={t.salesInvoices} value={item.numSalesInvoice} isCount />
                            <DetailRow label={t.creditNotes} value={item.numCreditNote} isCount />
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">{t.purchaseImport}</h4>
                            <DetailRow label={t.taxablePurchase} value={item.taxablePurchase} />
                            <DetailRow label={t.vatOnPurchase} value={item.vatOnTaxablePurchase} isVat />
                            <DetailRow label={t.taxableImport} value={item.taxableImport} />
                            <DetailRow label={t.vatOnImport} value={item.vatOnTaxableImport} isVat />
                            <DetailRow label={t.exemptPurchase} value={item.exemptPurchase} />
                            <DetailRow label={t.exemptImport} value={item.exemptImport} />
                            <DetailRow label={t.purchaseInvoices} value={item.numPurchaseInvoice} isCount />
                          </div>
                          <div className="space-y-4 md:col-span-2">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">{t.finalCalculation}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <DetailRow label={t.grossVatPayable} value={item.grossVatPayable} />
                              <DetailRow label={t.prevMonthCredit} value={item.previousMonthCredit} />
                              <DetailRow label={t.netVatPayable} value={item.netVatPayable} highlight />
                            </div>
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 border ${isMatch ? 'bg-green-50/50 border-green-200 text-green-700' : 'bg-amber-50/50 border-amber-200 text-amber-700'}`}>
                              {isMatch ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                              <div className="text-xs">
                                <p className="font-bold">{isMatch ? t.calculationMatch : t.calculationMismatch}</p>
                                {!isMatch && (
                                  <p className="opacity-90 mt-0.5">{t.expectedVat}: <span className="font-mono font-bold">Rs. {expectedNet.toLocaleString()}</span></p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}


function DetailRow({ label, value, isVat, isCount, highlight, isReturn }: { label: string, value: number, isVat?: boolean, isCount?: boolean, highlight?: boolean, isReturn?: boolean }) {
  return (
    <div className={`flex justify-between items-center p-2 rounded-lg ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm ${highlight ? 'font-bold text-primary' : isVat ? 'text-blue-600 font-medium' : isReturn ? 'text-orange-600 font-medium' : ''}`}>
        {isCount ? value : `Rs. ${value.toLocaleString()}`}
      </span>
    </div>
  );
}
