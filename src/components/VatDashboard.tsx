import { useState, useEffect } from "react";
import { FileUpload } from "./FileUpload";
import { VatTable } from "./VatTable";
import { VatReturn } from "@/types";
import { Button } from "@/components/ui/button";
import { Download, Calculator, History, Plus, FileText, Languages } from "lucide-react";
import { exportToExcel } from "@/lib/excelExport";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { translations, Language } from "@/lib/translations";

export default function VatDashboard() {
  const [returns, setReturns] = useState<VatReturn[]>([]);
  const [showUpload, setShowUpload] = useState(true);
  const [lang, setLang] = useState<Language>("en");

  const t = translations[lang];

  useEffect(() => {
    const saved = localStorage.getItem("vat_returns");
    const savedLang = localStorage.getItem("vat_lang") as Language;
    if (saved) {
      try {
        setReturns(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved returns", e);
      }
    }
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("vat_returns", JSON.stringify(returns));
  }, [returns]);

  useEffect(() => {
    localStorage.setItem("vat_lang", lang);
  }, [lang]);

  const handleAddReturn = (newReturns: VatReturn[]) => {
    setReturns((prev) => [...newReturns, ...prev]);
  };

  const handleDelete = (id: string) => {
    setReturns((prev) => prev.filter((r) => r.id !== id));
  };

  const totalNetPayable = returns.reduce((sum, r) => sum + r.netVatPayable, 0);
  const totalSales = returns.reduce((sum, r) => sum + r.taxableSales, 0);
  const totalVat = returns.reduce((sum, r) => sum + r.vatOnSales, 0);
  const totalPurchase = returns.reduce((sum, r) => sum + r.taxablePurchase, 0);
  const totalImport = returns.reduce((sum, r) => sum + r.taxableImport, 0);

  const uniqueCompanies = Array.from(new Set(returns.map(r => r.companyName)));
  const companyHeader = uniqueCompanies.length === 0 
    ? "VAT Tracker" 
    : uniqueCompanies.length === 1 
      ? uniqueCompanies[0] 
      : "Multiple Companies";

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{companyHeader}</h1>
            <p className="text-xs text-muted-foreground">{t.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button 
              variant={lang === "en" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setLang("en")}
              className="h-7 px-3 text-xs"
            >
              EN
            </Button>
            <Button 
              variant={lang === "ne" ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setLang("ne")}
              className="h-7 px-3 text-xs"
            >
              नेपाली
            </Button>
          </div>
          <Button 
            variant="outline" 
            onClick={() => exportToExcel(returns)}
            disabled={returns.length === 0}
            className="hidden sm:flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t.exportCsv}
          </Button>
          <Button onClick={() => setShowUpload(!showUpload)} variant="ghost" size="icon" className="sm:hidden">
            <Plus className={`h-4 w-4 transition-transform ${showUpload ? 'rotate-45' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Usage Note */}
        <Card className="bg-blue-50 border-blue-100 shadow-none">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="bg-blue-500/10 p-2 rounded-full h-fit">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-900">{t.howToUse}</h4>
                <p className="text-sm text-blue-800/80 leading-relaxed">
                  {t.howToUseText}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-white border-none shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold">{t.totalSales}</CardDescription>
              <CardTitle className="text-2xl font-mono">Rs. {totalSales.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white border-none shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold">{t.totalVat}</CardDescription>
              <CardTitle className="text-2xl font-mono">Rs. {totalVat.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white border-none shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold">{t.totalPurchase}</CardDescription>
              <CardTitle className="text-2xl font-mono">Rs. {totalPurchase.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white border-none shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold">{t.totalImport}</CardDescription>
              <CardTitle className="text-2xl font-mono">Rs. {totalImport.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-white border-none shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold">{t.netPayable}</CardDescription>
              <CardTitle className="text-2xl font-mono">Rs. {totalNetPayable.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Upload Section */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <FileUpload onUploadSuccess={handleAddReturn} lang={lang} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table Section */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                {t.returnHistory}
              </CardTitle>
              <CardDescription>{t.historySubtitle}</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => exportToExcel(returns)}
              disabled={returns.length === 0}
              className="sm:hidden"
            >
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <VatTable data={returns} onDelete={handleDelete} lang={lang} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

