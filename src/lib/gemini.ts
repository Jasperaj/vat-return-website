import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const vatReturnSchema = {
  type: Type.OBJECT,
  properties: {
    month: { type: Type.STRING, description: "The month and year of the VAT return, e.g., '2082/11' or 'Feb 2024'" },
    taxableSales: { type: Type.NUMBER },
    nonTaxableSales: { type: Type.NUMBER },
    vatOnSales: { type: Type.NUMBER },
    taxableImport: { type: Type.NUMBER },
    taxablePurchase: { type: Type.NUMBER },
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
  required: [
    "month", "taxableSales", "vatOnSales", "taxablePurchase", "vatOnTaxablePurchase", "netVatPayable"
  ],
};

export async function parseVatReturn(base64Data: string, mimeType: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Extract VAT return details from this image/PDF. The document is a VAT return form from Nepal (Internal Revenue Department). Map the fields correctly. If a field is missing, use 0." },
          { inlineData: { data: base64Data, mimeType } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: vatReturnSchema,
    }
  });

  return JSON.parse(response.text);
}
