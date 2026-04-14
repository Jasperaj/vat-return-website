import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const vatReturnSchema = {
  type: Type.OBJECT,
  properties: {
    isVatReturn: { type: Type.BOOLEAN, description: "Whether the document is a valid VAT return form" },
    month: { type: Type.STRING, description: "The month and year of the VAT return in 'YYYY - MM' format, e.g., '2082 - 11'" },
    companyName: { type: Type.STRING, description: "The name of the company as it appears in the document, do not translate" },
    pan: { type: Type.STRING, description: "The PAN (Permanent Account Number) of the company as it appears in the document" },
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
    "isVatReturn", "month", "companyName", "pan", "taxableSales", "vatOnSales", "taxablePurchase", "vatOnTaxablePurchase", "netVatPayable"
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
          { text: "Analyze this document. First, determine if it is a VAT return form from Nepal (Internal Revenue Department). If it is, set isVatReturn to true and extract the details. If it is NOT a VAT return form, set isVatReturn to false and you can leave other fields as 0 or empty strings. Extract the company name exactly as it appears in the document (do not translate). Extract the PAN number exactly as it appears. Extract the month and year in 'YYYY - MM' format. Map the fields correctly. If a field is missing on a valid form, use 0." },
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
  if (!data.isVatReturn) {
    throw new Error("The uploaded document does not appear to be a valid VAT return form.");
  }
  return data;
}
