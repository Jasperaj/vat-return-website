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
import { Trash2, Eye, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface VatTableProps {
  data: VatReturn[];
  onDelete: (id: string) => void;
}

export function VatTable({ data, onDelete }: VatTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">No VAT returns added yet.</p>
          <p className="text-xs text-muted-foreground/70">Upload your first return to see the summary here.</p>
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
              <TableHead className="w-[120px] font-bold text-foreground">Month</TableHead>
              <TableHead className="font-bold text-foreground">Filename</TableHead>
              <TableHead className="text-right font-bold text-foreground">Taxable Sales</TableHead>
              <TableHead className="text-right font-bold text-foreground">VAT Collected</TableHead>
              <TableHead className="text-right font-bold text-foreground">Net Payable</TableHead>
              <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
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
                <TableCell className="text-right font-mono text-sm text-blue-600 font-medium">
                  {item.vatOnSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-bold">
                  {item.netVatPayable.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Dialog>
                      <DialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}>
                        <Eye className="h-4 w-4" />
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            VAT Return Details - {item.month}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Sales Summary</h4>
                            <DetailRow label="Taxable Sales" value={item.taxableSales} />
                            <DetailRow label="Non-Taxable Sales" value={item.nonTaxableSales} />
                            <DetailRow label="VAT on Sales" value={item.vatOnSales} isVat />
                            <DetailRow label="Sales Invoices" value={item.numSalesInvoice} isCount />
                            <DetailRow label="Credit Notes" value={item.numCreditNote} isCount />
                          </div>
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Purchase & Import</h4>
                            <DetailRow label="Taxable Purchase" value={item.taxablePurchase} />
                            <DetailRow label="VAT on Purchase" value={item.vatOnTaxablePurchase} isVat />
                            <DetailRow label="Taxable Import" value={item.taxableImport} />
                            <DetailRow label="VAT on Import" value={item.vatOnTaxableImport} isVat />
                            <DetailRow label="Exempt Purchase" value={item.exemptPurchase} />
                            <DetailRow label="Exempt Import" value={item.exemptImport} />
                            <DetailRow label="Purchase Invoices" value={item.numPurchaseInvoice} isCount />
                          </div>
                          <div className="space-y-4 md:col-span-2">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Final Calculation</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <DetailRow label="Gross VAT Payable" value={item.grossVatPayable} />
                              <DetailRow label="Prev Month Credit" value={item.previousMonthCredit} />
                              <DetailRow label="Net VAT Payable" value={item.netVatPayable} highlight />
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
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function DetailRow({ label, value, isVat, isCount, highlight }: { label: string, value: number, isVat?: boolean, isCount?: boolean, highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center p-2 rounded-lg ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm ${highlight ? 'font-bold text-primary' : isVat ? 'text-blue-600 font-medium' : ''}`}>
        {isCount ? value : `Rs. ${value.toLocaleString()}`}
      </span>
    </div>
  );
}
