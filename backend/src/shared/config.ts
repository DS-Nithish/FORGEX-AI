import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env from cwd or parent directory
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const envSchema = z.object({
  PORT: z
    .string()
    .default("4000")
    .transform((v) => parseInt(v, 10)),
  DATABASE_URL: z.string().default("./agentshield.db"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY must not be empty — add it to your .env file"),
  GROQ_MODEL: z.string().default("openai/gpt-oss-20b"),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    const errorMsg = `\n❌ Environment validation failed:\n${formatted}\n`;
    throw new Error(errorMsg);
  }

  return parsed.data;
}

export const config = loadConfig();
