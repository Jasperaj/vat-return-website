import React, { useState, useRef } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseVatReturn, AIConfig } from "@/lib/aiService";
import { VatReturn } from "@/types";
import { toast } from "sonner";
import { translations, Language } from "@/lib/translations";
import { motion } from "motion/react";

interface FileUploadProps {
  onUploadSuccess: (data: VatReturn[]) => void;
  lang: Language;
}

export function FileUpload({ onUploadSuccess, lang }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    if (files.length > 12) {
      toast.error(lang === "en" ? "You can only upload up to 12 files at a time." : "तपाईं एक पटकमा १२ वटा फाइलहरू मात्र अपलोड गर्न सक्नुहुन्छ।");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    const processedReturns: VatReturn[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
          errors.push(`${file.name}: ${t.unsupportedType}`);
          continue;
        }

        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const savedConfig = localStorage.getItem("vat_ai_config");
          const config: AIConfig = savedConfig ? JSON.parse(savedConfig) : { activeProvider: "gemini" };
          
          const parsedData = await parseVatReturn(base64Data, file.type, config);
          
          processedReturns.push({
            ...parsedData,
            id: crypto.randomUUID(),
            filename: file.name,
            dateAdded: new Date().toLocaleString(),
          });
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          errors.push(`${file.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
        
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      if (processedReturns.length > 0) {
        onUploadSuccess(processedReturns);
        toast.success(t.success);
      }

      if (errors.length > 0) {
        errors.forEach(err => toast.error(err, { duration: 5000 }));
      }
    } catch (error) {
      console.error("Critical error processing files:", error);
      toast.error(t.errorProcessing);
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="border-dashed border-2 bg-muted/50">
      <CardContent className="flex flex-col items-center justify-center py-10">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          {isUploading ? (
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                {progress}%
              </div>
            </div>
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {isUploading ? `${t.processing} (${progress}%)` : t.uploadReturns}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t.uploadNote}
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,application/pdf"
            multiple
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            variant="outline"
          >
            {isUploading ? t.pleaseWait : t.selectFiles}
          </Button>
          
          {isUploading && (
            <div className="mt-4 w-64 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

