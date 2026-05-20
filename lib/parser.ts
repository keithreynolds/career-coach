/**
 * Resume file parser.
 * Extracts plain text from PDF or DOCX files.
 *
 * NOTE: pdf-parse and mammoth are CommonJS / Node-only and must be loaded
 * dynamically inside the Node runtime API route.
 */

export type ParsedResume = {
  text: string;
  source: "pdf" | "docx";
};

export async function parseResume(
  buffer: Buffer,
  filename: string
): Promise<ParsedResume> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    // Import the inner module to bypass pdf-parse's index.js debug-mode
    // self-test, which can fail in bundled server environments.
    // @ts-expect-error - no type declaration for the inner path
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const result = await pdfParse(buffer);
    return { text: result.text ?? "", source: "pdf" };
  }

  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value ?? "", source: "docx" };
  }

  throw new Error(
    "Unsupported file type. Only .pdf and .docx files are accepted."
  );
}
