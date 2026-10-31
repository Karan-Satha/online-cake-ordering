import OpenAI from "openai";

let openaiClient;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;

  openaiClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}
