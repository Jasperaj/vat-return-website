import React, { useState, useRef } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseVatReturn } from "@/lib/gemini";
import { VatReturn } from "@/types";
import { toast } from "sonner";

interface FileUploadProps {
  onUploadSuccess: (data: VatReturn[]) => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 12) {
      toast.error("You can only upload up to 12 files at a time.");
      return;
    }

    setIsUploading(true);
    const processedReturns: VatReturn[] = [];

    try {
      for (const file of files as File[]) {
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
          toast.warning(`Skipping ${file.name}: Unsupported file type.`);
          continue;
        }

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file as Blob);
        });

        const parsedData = await parseVatReturn(base64Data, file.type);
        
        processedReturns.push({
          ...parsedData,
          id: crypto.randomUUID(),
          filename: file.name,
          dateAdded: new Date().toLocaleString(),
        });
      }

      onUploadSuccess(processedReturns);
      toast.success(`${processedReturns.length} VAT returns processed successfully!`);
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Failed to process some VAT returns. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="border-dashed border-2 bg-muted/50">
      <CardContent className="flex flex-col items-center justify-center py-10">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            {isUploading ? "Processing VAT Returns..." : "Upload VAT Returns"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload up to 12 PDF or image files of your VAT return forms
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
            {isUploading ? "Please wait..." : "Select Files"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
