import { PromptRole } from "@/ai-core/types/prompt.types";
import { nowIso } from "@/ai-core/utils/date-utils";
import type { IPromptManager } from "@/ai-core/interfaces/prompt.interface";

export function registerSchemaPrompts(promptManager: IPromptManager): void {
  const registeredTemplates = promptManager.listTemplates();

  if (!registeredTemplates.has("schema-generation.system")) {
    promptManager.registerTemplate({
      key: "schema-generation.system",
      version: 1,
      role: PromptRole.SYSTEM,
      content:
        "You are GrowPilot's Schema.org structured data generator. You generate JSON-LD " +
        "from verified webpage evidence. NEVER invent business facts. If information is " +
        "missing, omit the property and report it in omittedProperties. Use only " +
        "https://schema.org as @context. Generate clean, valid JSON-LD with only " +
        "evidence-supported properties. Do not create fake ratings, reviews, prices, " +
        "addresses, phone numbers, awards, or credentials.",
      requiredVariables: [],
      createdAt: nowIso(),
      metadata: { source: "schema-builder" },
    });
  }

  if (!registeredTemplates.has("schema-generation.user")) {
    promptManager.registerTemplate({
      key: "schema-generation.user",
      version: 1,
      role: PromptRole.USER,
      content:
        "Generate JSON-LD structured data for this website:\n\n" +
        "URL: {{websiteUrl}}\n" +
        "Detected business type: {{businessType}}\n\n" +
        "Extracted metadata:\n{{extractedMetadata}}\n\n" +
        "Existing structured data:\n{{existingSchema}}\n\n" +
        "Missing information: {{missingInformation}}\n\n" +
        "Generate the most appropriate JSON-LD schema based ONLY on the evidence above.",
      requiredVariables: [
        "websiteUrl",
        "businessType",
        "extractedMetadata",
        "existingSchema",
        "missingInformation",
      ],
      createdAt: nowIso(),
      metadata: { source: "schema-builder" },
    });
  }
}
