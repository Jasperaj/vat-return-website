import { useState, useEffect, useRef, ChangeEvent } from "react";
import { FileUpload } from "./FileUpload";
import { VatTable } from "./VatTable";
import { VatTrendChart } from "./VatTrendChart";
import { VatReturn } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Download, Calculator, History, Plus, FileText, Languages, HelpCircle, Trash2, Settings, RefreshCw, Loader2 } from "lucide-react";
import { exportToExcel } from "@/lib/excelExport";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { translations, Language } from "@/lib/translations";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AIConfig, AIProvider, testConnection, parseVatReturn } from "@/lib/aiService";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function VatDashboard() {
  const [returns, setReturns] = useState<VatReturn[]>([]);
  const [showUpload, setShowUpload] = useState(true);
  const [lang, setLang] = useState<Language>("en");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [config, setConfig] = useState<AIConfig>({
    activeProvider: "gemini",
    geminiKey: "",
    geminiModel: "gemini-3-flash-preview",
    openaiKey: "",
    anthropicKey: "",
    ollamaUrl: "http://localhost:11434",
  });
  
  const [testStatus, setTestStatus] = useState<Record<AIProvider, "idle" | "testing" | "success" | "failed">>({
    gemini: "idle",
    openai: "idle",
    anthropic: "idle",
    ollama: "idle",
  });

  const [recheckTargetId, setRecheckTargetId] = useState<string | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);
  const recheckFileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];
  const ug = t.userGuide;

  useEffect(() => {
    const saved = localStorage.getItem("vat_returns");
    const savedLang = localStorage.getItem("vat_lang") as Language;
    const savedConfig = localStorage.getItem("vat_ai_config");
    
    if (saved) {
      try {
        setReturns(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved returns", e);
      }
    }
    if (savedLang) setLang(savedLang);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to load saved AI config", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("vat_returns", JSON.stringify(returns));
  }, [returns]);

  useEffect(() => {
    localStorage.setItem("vat_lang", lang);
  }, [lang]);

  const handleSaveSettings = () => {
    localStorage.setItem("vat_ai_config", JSON.stringify(config));
    setIsSettingsOpen(false);
    toast.success(t.success);
  };

  const handleTestConnection = async (provider: AIProvider) => {
    setTestStatus(prev => ({ ...prev, [provider]: "testing" }));
    
    const key = provider === "gemini" ? config.geminiKey : 
                provider === "openai" ? config.openaiKey : 
                provider === "anthropic" ? config.anthropicKey : "";
    const working = await testConnection(provider, key || "", config.ollamaUrl);
    
    setTestStatus(prev => ({ ...prev, [provider]: working ? "success" : "failed" }));
    if (working) toast.success(`${provider}: ${t.testSuccess}`);
    else {
      if (provider === "ollama") {
        toast.error(`${provider}: ${t.testFailed}`, {
          description: t.ollamaHint
        });
      } else {
        toast.error(`${provider}: ${t.testFailed}`);
      }
    }
  };

  const handleAddReturn = (newReturns: VatReturn[]) => {
    setReturns((prev) => [...newReturns, ...prev]);
  };

  const handleDelete = (id: string) => {
    setReturns((prev) => prev.filter((r) => r.id !== id));
  };

  const handleReset = () => {
    setReturns([]);
    setIsResetDialogOpen(false);
  };

  const handleRecheckClick = (id: string) => {
    setRecheckTargetId(id);
    if (recheckFileInputRef.current) {
      recheckFileInputRef.current.click();
    }
  };

  const handleRecheckFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recheckTargetId) return;

    setIsRechecking(true);
    const toastId = toast.loading(`${t.testing} ${file.name}...`);

    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const updatedData = await parseVatReturn(base64Data, file.type, config, true);
      
      setReturns(prev => prev.map(ret => 
        ret.id === recheckTargetId 
          ? { ...updatedData, id: recheckTargetId, filename: file.name } 
          : ret
      ));

      toast.success(t.success, { id: toastId });
    } catch (error: any) {
      console.error("Recheck failed:", error);
      toast.error(error.message || "Failed to re-process document.", { id: toastId });
    } finally {
      setIsRechecking(false);
      setRecheckTargetId(null);
      if (e.target) e.target.value = "";
    }
  };

  const totalNetPayable = returns.reduce((sum, r) => sum + r.netVatPayable, 0);
  const totalSales = returns.reduce((sum, r) => sum + (r.taxableSales - r.salesReturn), 0);
  const totalVat = returns.reduce((sum, r) => sum + r.vatOnSales, 0);
  const totalPurchase = returns.reduce((sum, r) => sum + (r.taxablePurchase - r.purchaseReturn), 0);
  const totalImport = returns.reduce((sum, r) => sum + r.taxableImport, 0);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
        <Toaster position="top-right" />
        
        {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <DialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-2 text-muted-foreground hover:text-destructive cursor-pointer")}>
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t.clearAll}</span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.clearAllConfirmTitle}</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground">{t.clearAllConfirmText}</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>{t.cancel}</Button>
                <Button variant="destructive" onClick={handleReset}>{t.confirm}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-2 text-muted-foreground hover:text-primary cursor-pointer")}>
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{t.instructions}</span>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <HelpCircle className="h-6 w-6 text-primary" />
                  {ug.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <section>
                  <h3 className="text-lg font-bold text-foreground mb-2">{ug.overview.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{ug.overview.text}</p>
                </section>
                
                <section>
                  <h3 className="text-lg font-bold text-foreground mb-2">{ug.gettingStarted.title}</h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>{ug.gettingStarted.language}</li>
                    <li className="list-none mt-2">
                      <span className="font-semibold block mb-1">{ug.gettingStarted.upload.title}</span>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>{ug.gettingStarted.upload.step1}</li>
                        <li>{ug.gettingStarted.upload.step2}</li>
                        <li>{ug.gettingStarted.upload.step3}</li>
                        <li>{ug.gettingStarted.upload.step4}</li>
                      </ul>
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground mb-2">{ug.managingData.title}</h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    <li>{ug.managingData.stats}</li>
                    <li>{ug.managingData.history}</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-foreground mb-2">{ug.exporting.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{ug.exporting.text}</p>
                </section>
              </div>
            </DialogContent>
          </Dialog>

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

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-2 text-muted-foreground hover:text-primary cursor-pointer")}>
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t.settings}</span>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t.settings}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <RadioGroup 
                  value={config.activeProvider} 
                  onValueChange={(val) => setConfig(prev => ({ ...prev, activeProvider: val as AIProvider }))}
                  className="space-y-4"
                >
                  {/* Gemini */}
                  <div className="space-y-3 p-4 border rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="gemini" id="gemini" />
                        <Label htmlFor="gemini" className="font-bold text-base cursor-pointer">Google Gemini</Label>
                        <Badge variant="outline" className="text-[10px] py-0">Vision + Multi-page</Badge>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs gap-1"
                        onClick={() => handleTestConnection("gemini")}
                        disabled={testStatus.gemini === "testing" || !config.geminiKey}
                      >
                        {testStatus.gemini === "testing" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {testStatus.gemini === "success" && <Check className="h-3 w-3 text-green-500" />}
                        {testStatus.gemini === "failed" && <AlertCircle className="h-3 w-3 text-destructive" />}
                        {t.test}
                      </Button>
                    </div>
                    <div className="pl-6 space-y-1.5">
                      <Label htmlFor="geminiKey" className="text-xs text-muted-foreground">{t.geminiKey}</Label>
                      <Input 
                        id="geminiKey" 
                        type="password" 
                        placeholder={t.apiKeyPlaceholder}
                        value={config.geminiKey}
                        onChange={(e) => setConfig(prev => ({ ...prev, geminiKey: e.target.value }))}
                      />
                    </div>
                    <div className="pl-6 space-y-1.5">
                      <Label htmlFor="geminiModel" className="text-xs text-muted-foreground">{t.geminiModel}</Label>
                      <Select 
                        value={config.geminiModel || "gemini-3-flash-preview"} 
                        onValueChange={(val) => setConfig(prev => ({ ...prev, geminiModel: val }))}
                      >
                        <SelectTrigger id="geminiModel" className="h-9">
                          <SelectValue placeholder="Select Model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash (Fast + Precise)</SelectItem>
                          <SelectItem value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Extra Complex)</SelectItem>
                          <SelectItem value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite (Fastest)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* OpenAI */}
                  <div className="space-y-3 p-4 border rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="openai" id="openai" />
                        <Label htmlFor="openai" className="font-bold text-base cursor-pointer">OpenAI (GPT-4o)</Label>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs gap-1"
                        onClick={() => handleTestConnection("openai")}
                        disabled={testStatus.openai === "testing" || !config.openaiKey}
                      >
                        {testStatus.openai === "testing" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {testStatus.openai === "success" && <Check className="h-3 w-3 text-green-500" />}
                        {testStatus.openai === "failed" && <AlertCircle className="h-3 w-3 text-destructive" />}
                        {t.test}
                      </Button>
                    </div>
                    <div className="pl-6 space-y-1.5">
                      <Label htmlFor="openaiKey" className="text-xs text-muted-foreground">{t.openaiKey}</Label>
                      <Input 
                        id="openaiKey" 
                        type="password" 
                        placeholder={t.apiKeyPlaceholder}
                        value={config.openaiKey}
                        onChange={(e) => setConfig(prev => ({ ...prev, openaiKey: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Anthropic */}
                  <div className="space-y-3 p-4 border rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="anthropic" id="anthropic" />
                        <Label htmlFor="anthropic" className="font-bold text-base cursor-pointer">Anthropic Claude 3.5</Label>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs gap-1"
                        onClick={() => handleTestConnection("anthropic")}
                        disabled={testStatus.anthropic === "testing" || !config.anthropicKey}
                      >
                        {testStatus.anthropic === "testing" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {testStatus.anthropic === "success" && <Check className="h-3 w-3 text-green-500" />}
                        {testStatus.anthropic === "failed" && <AlertCircle className="h-3 w-3 text-destructive" />}
                        {t.test}
                      </Button>
                    </div>
                    <div className="pl-6 space-y-1.5">
                      <Label htmlFor="anthropicKey" className="text-xs text-muted-foreground">{t.anthropicKey}</Label>
                      <Input 
                        id="anthropicKey" 
                        type="password" 
                        placeholder={t.apiKeyPlaceholder}
                        value={config.anthropicKey}
                        onChange={(e) => setConfig(prev => ({ ...prev, anthropicKey: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Ollama */}
                  <div className="space-y-3 p-4 border rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="ollama" id="ollama" />
                        <Label htmlFor="ollama" className="font-bold text-base cursor-pointer">Ollama (Local)</Label>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 text-xs gap-1"
                        onClick={() => handleTestConnection("ollama")}
                        disabled={testStatus.ollama === "testing"}
                      >
                        {testStatus.ollama === "testing" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {testStatus.ollama === "success" && <Check className="h-3 w-3 text-green-500" />}
                        {testStatus.ollama === "failed" && <AlertCircle className="h-3 w-3 text-destructive" />}
                        {t.test}
                      </Button>
                    </div>
                    <div className="pl-6 space-y-1.5">
                      <Label htmlFor="ollamaUrl" className="text-xs text-muted-foreground">{t.ollamaUrl}</Label>
                      <Input 
                        id="ollamaUrl" 
                        placeholder={t.ollamaUrlPlaceholder}
                        value={config.ollamaUrl}
                        onChange={(e) => setConfig(prev => ({ ...prev, ollamaUrl: e.target.value }))}
                      />
                    </div>
                  </div>
                </RadioGroup>

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <HelpCircle className="h-4 w-4" />
                    <h5 className="font-bold text-sm tracking-tight">{t.helpHowToGetKeys}</h5>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <ExternalLink className="h-3 w-3" />
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="hover:underline">{t.helpGeminiTitle}</a>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t.helpGeminiText}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{t.helpOtherTitle}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t.helpOtherText}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center sm:hidden">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-10 gap-2"
                    onClick={() => exportToExcel(returns)}
                    disabled={returns.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    {t.exportCsv}
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground text-center italic">{t.apiNote}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>{t.cancel}</Button>
                <Button onClick={handleSaveSettings}>{t.save}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setShowUpload(!showUpload)} variant="ghost" size="icon" className="sm:hidden">
            <Plus className={`h-4 w-4 transition-transform ${showUpload ? 'rotate-45' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <input 
          type="file" 
          ref={recheckFileInputRef} 
          className="hidden" 
          accept=".pdf,image/*" 
          onChange={handleRecheckFile}
        />
        {isRechecking && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-center gap-3 text-amber-900"
          >
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            <span className="font-bold text-sm tracking-tight">{t.testing} ...</span>
          </motion.div>
        )}
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

        {/* Trend Chart Section */}
        {returns.length > 0 && (
          <Card className="border-none shadow-sm bg-white p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                {t.vatTrend}
              </CardTitle>
            </CardHeader>
            <VatTrendChart data={returns} lang={lang} />
          </Card>
        )}

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
            <VatTable 
              data={returns} 
              onDelete={handleDelete} 
              onRecheck={handleRecheckClick}
              lang={lang} 
            />
          </CardContent>
        </Card>
      </main>
      </div>
    </TooltipProvider>
  );
}

