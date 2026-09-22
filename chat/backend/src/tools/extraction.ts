import { PDFParse } from "pdf-parse";
import fs from "node:fs";

export interface DocumentExtractionResult {
  text: string;
  pageCount?: number;
}

/**
 * Extracts raw textual content from a PDF buffer or file path.
 * This is a plain preprocessing utility, not an LLM-invoked tool,
 * and carries LOW risk.
 */
export async function extractDocument(
  input: Buffer | Uint8Array | string,
): Promise<DocumentExtractionResult> {
  let uint8: Uint8Array;

  if (typeof input === "string") {
    if (!fs.existsSync(input)) {
      throw new Error(`PDF fixture not found at path: ${input}`);
    }
    const buf = fs.readFileSync(input);
    uint8 = new Uint8Array(buf);
  } else if (Buffer.isBuffer(input)) {
    uint8 = new Uint8Array(input);
  } else {
    uint8 = input;
  }

  const parser = new PDFParse(uint8);
  const result = await parser.getText();
  const text = (result?.text || "").trim();

  return {
    text,
    pageCount: result?.total || result?.pages?.length || 1,
  };
}
