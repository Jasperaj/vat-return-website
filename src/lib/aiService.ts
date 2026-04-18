import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type AIProvider = "gemini" | "openai" | "anthropic" | "ollama";

export interface AIConfig {
  activeProvider: AIProvider;
  geminiKey?: string;
  geminiModel?: string;
  openaiKey?: string;
  anthropicKey?: string;
  ollamaUrl?: string;
}

export const vatReturnSchema = {
  type: Type.OBJECT,
  properties: {
    isVatReturn: { type: Type.BOOLEAN, description: "Whether the document is a valid VAT return form" },
    month: { type: Type.STRING, description: "The month and year of the VAT return in 'YYYY - MM' format, e.g., '2082 - 11'" },
    companyName: { type: Type.STRING, description: "The name of the company as it appears in the document, do not translate" },
    pan: { type: Type.STRING, description: "The PAN (Permanent Account Number) of the company as it appears in the document" },
    taxableSales: { type: Type.NUMBER },
    salesReturn: { type: Type.NUMBER },
    nonTaxableSales: { type: Type.NUMBER },
    vatOnSales: { type: Type.NUMBER },
    taxableImport: { type: Type.NUMBER },
    taxablePurchase: { type: Type.NUMBER },
    purchaseReturn: { type: Type.NUMBER },
    vatOnTaxableImport: { type: Type.NUMBER },
    vatOnTaxablePurchase: { type: Type.NUMBER },
    exemptPurchase: { type: Type.NUMBER },
    exemptImport: { type: Type.NUMBER },
    grossVatPayable: { type: Type.NUMBER },
    previousMonthCredit: { type: Type.NUMBER },
    netVatPayable: { type: Type.NUMBER },
    numSalesInvoice: { type: Type.NUMBER },
    numCreditNote: { type: Type.NUMBER },
    numPurchaseInvoice: { type: Type.NUMBER },
    numDebitNote: { type: Type.NUMBER },
    numCreditAdvice: { type: Type.NUMBER },
  },
  required: ["isVatReturn", "month", "companyName", "pan", "taxableSales", "vatOnSales", "taxablePurchase", "vatOnTaxablePurchase", "netVatPayable"],
};

const PROMPT = "Analyze this document. First, determine if it is a VAT return form from Nepal (Internal Revenue Department). If it is, set isVatReturn to true and extract the details. Extract the company name exactly as it appears. Extract the PAN number. Extract the month and year in 'YYYY - MM' format. For salesReturn and purchaseReturn, extract the total monetary amounts of credit notes and debit notes respectively. Ensure taxableSales and taxablePurchase are extracted as the gross taxable amounts before these returns if possible, or as explicitly listed in the 'Taxable' columns. Map the fields correctly. If a field is missing, use 0. Return ONLY JSON.";

export async function testConnection(provider: AIProvider, key: string, url?: string): Promise<boolean> {
  try {
    if (provider === "gemini") {
      const ai = new GoogleGenAI({ apiKey: key });
      await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: "ping" }] }]
      });
      return true;
    } else if (provider === "openai") {
      const openai = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
      await openai.models.list();
      return true;
    } else if (provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true } as any);
      await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      return true;
    } else if (provider === "ollama") {
      const response = await fetch(`${url}/api/tags`);
      return response.ok;
    }
    return false;
  } catch (error) {
    console.error(`Connection test failed for ${provider}:`, error);
    return false;
  }
}

export async function parseVatReturn(base64Data: string, mimeType: string, config: AIConfig, isDeepScan = false, retryCount = 0): Promise<any> {
  const { activeProvider, geminiKey, openaiKey, anthropicKey, ollamaUrl } = config;

  const SCAN_PROMPT = isDeepScan 
    ? PROMPT + "\n\nCRITICAL: A previous attempt had calculation errors. Please perform a DEEP SCAN of the document. Triple-check every single digit. Ensure that (Taxable Sales * 0.13) equals the extracted VAT on Sales exactly. If there's a discrepancy in the document itself, report the values as they appear but double-check that you haven't misread a 6 as an 8, or a 0 as a 9."
    : PROMPT;

  if (activeProvider === "gemini") {
    const apiKey = geminiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key is not configured.");
    const ai = new GoogleGenAI({ apiKey });
    let modelName = config.geminiModel || "gemini-3-flash-preview";
    
    // Upgrade to Pro for deep scans if currently on a flash model
    if (isDeepScan && modelName.includes("flash")) {
      modelName = "gemini-3.1-pro-preview";
    }
    
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            parts: [
              { text: SCAN_PROMPT },
              { inlineData: { data: base64Data, mimeType } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: vatReturnSchema,
        }
      });
      const data = JSON.parse(response.text);
      if (!data.isVatReturn) throw new Error("Invalid document.");
      return data;
    } catch (error: any) {
      if (retryCount < 1 && error?.message?.includes("INTERNAL")) return parseVatReturn(base64Data, mimeType, config, isDeepScan, retryCount + 1);
      throw error;
    }
  }

  if (activeProvider === "openai") {
    if (!openaiKey) throw new Error("OpenAI API key is not configured.");
    const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
          ],
        },
      ],
      response_format: { type: "json_object" },
    });
    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");
    const data = JSON.parse(content);
    if (!data.isVatReturn) throw new Error("Invalid document.");
    return data;
  }

  if (activeProvider === "anthropic") {
    if (!anthropicKey) throw new Error("Anthropic API key is not configured.");
    const anthropic = new Anthropic({ apiKey: anthropicKey, dangerouslyAllowBrowser: true } as any);
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType as any, data: base64Data } },
            { type: "text", text: PROMPT }
          ],
        },
      ],
    });
    const textPart = response.content.find(p => p.type === 'text');
    if (!textPart || textPart.type !== 'text') throw new Error("No text response from Anthropic");
    const data = JSON.parse(textPart.text);
    if (!data.isVatReturn) throw new Error("Invalid document.");
    return data;
  }

  if (activeProvider === "ollama") {
    if (!ollamaUrl) throw new Error("Ollama URL is not configured.");
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: 'llava',
        prompt: PROMPT,
        images: [base64Data],
        stream: false,
        format: 'json'
      })
    });
    const result = await response.json();
    const data = JSON.parse(result.response);
    if (!data.isVatReturn) throw new Error("Invalid document.");
    return data;
  }

  throw new Error("No active AI provider selected.");
}
