import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import type { GeoAuditAgentInput, GeoAuditAgentOutput } from "@/ai-core/agents/geo-audit-agent";
import type { GeneralAgentInput, GeneralAgentOutput } from "@/ai-core/agents/general-agent";
import type {
  LeadOutreachInput,
  LeadOutreachOutput,
  LeadQualificationInput,
  LeadQualificationOutput,
} from "@/ai-core/agents/lead-qualification-agent";
import { LeadQualificationAgent } from "@/ai-core/agents/lead-qualification-agent";
import type { SchemaAgentInput, SchemaAgentOutput } from "@/ai-core/agents/schema-agent";
import type { SeoAuditAgentInput, SeoAuditAgentOutput } from "@/ai-core/agents/seo-audit-agent";
import { bootstrapAICore, sharedPromptManager } from "@/ai-core/bootstrap/register-agents";
import { detectBusinessTypeDeterministic } from "@/ai-core/tools/schema-builder/business-type-detector";
import { extractMetadata } from "@/ai-core/tools/schema-builder/metadata-extractor";
import { analyzeReadability } from "@/ai-core/tools/schema-builder/readability-analyzer";
import { validateSchema } from "@/ai-core/tools/schema-builder/schema-validator";
import { detectStructuredData } from "@/ai-core/tools/schema-builder/structured-data-detector";
import { fetchWebsite, parseHtml } from "@/ai-core/tools/schema-builder/website-fetcher";
import type { SchemaType } from "@/ai-core/tools/schema-builder/types";
import { registerSchemaPrompts } from "@/ai-core/prompts/schema-prompts";
import { AIEngine } from "@/ai-core/engine/ai-engine";
import type { OrganizationId, SessionId, UserId } from "@/ai-core/types/common.types";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { UnauthorizedError } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schemaTypes = [
  "Organization",
  "LocalBusiness",
  "Restaurant",
  "Store",
  "Service",
  "Product",
  "SoftwareApplication",
  "Article",
  "Person",
] as const;

const requestSchema = z.discriminatedUnion("agent", [
  z.object({
    agent: z.literal("seo-audit"),
    payload: z.object({
      url: z.string().url(),
      businessName: z.string().min(1),
      focusAreas: z.string().min(1),
    }),
  }),
  z.object({
    agent: z.literal("geo-audit"),
    payload: z.object({
      url: z.string().url(),
      businessName: z.string().min(1),
      focusAreas: z.array(z.string().min(1)).min(1).max(5),
    }),
  }),
  z.object({
    agent: z.literal("schema"),
    payload: z.object({
      url: z.string().url(),
      businessType: z.union([z.enum(schemaTypes), z.literal("Auto Detect"), z.literal("auto")]),
    }),
  }),
  z.object({
    agent: z.literal("lead-qualification"),
    payload: z.object({
      businessName: z.string().min(1),
      industry: z.string().min(1),
      location: z.string().min(1),
      targetCustomer: z.string().optional(),
      website: z.string().url().optional().or(z.literal("")),
      description: z.string().optional(),
    }),
  }),
  z.object({
    agent: z.literal("lead-outreach"),
    payload: z.object({
      businessName: z.string().min(1),
      industry: z.string().min(1),
      location: z.string().min(1),
      opportunity: z.string().min(1),
      recommendedService: z.string().min(1),
      channel: z.enum(["email", "whatsapp", "general"]),
      senderName: z.string().optional(),
    }),
  }),
  z.object({
    agent: z.literal("general"),
    payload: z.object({
      prompt: z.string().min(1).max(12000),
      systemMessage: z.string().optional(),
    }),
  }),
]);

function isAuthorized(request: Request): boolean {
  const expectedToken = process.env.AI_SERVICE_TOKEN;
  const authorization = request.headers.get("authorization");
  const suppliedToken = authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!expectedToken || expectedToken.length < 32 || !suppliedToken) return false;

  const expected = Buffer.from(expectedToken);
  const supplied = Buffer.from(suppliedToken);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function createEngine(): AIEngine {
  bootstrapAICore();
  return new AIEngine({ promptManager: sharedPromptManager });
}

function identity(agent: string) {
  return {
    organizationId: "grovcentric-web" as OrganizationId,
    userId: "grovcentric-service" as UserId,
    sessionId: `grovcentric-${agent}-${Date.now()}` as SessionId,
  };
}

async function runAgent<TInput, TOutput>(agentId: string, payload: TInput): Promise<TOutput> {
  const result = await createEngine().run<TInput, TOutput>({
    agentId,
    identity: identity(agentId),
    payload,
  });
  return result.result;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!process.env.AI_SERVICE_TOKEN || process.env.AI_SERVICE_TOKEN.length < 32) {
      return NextResponse.json(
        { success: false, error: { message: "AI service integration is not configured." } },
        { status: 503 },
      );
    }
    if (!isAuthorized(request)) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Invalid agent request.", details: parsed.error.flatten() },
        },
        { status: 422 },
      );
    }

    let data: unknown;
    switch (parsed.data.agent) {
      case "seo-audit": {
        const { url, businessName, focusAreas } = parsed.data.payload;
        const website = await fetchWebsite(url);
        const payload: SeoAuditAgentInput = {
          url: website.finalUrl,
          businessName,
          siteData: website.html.slice(0, 8000),
          focusAreas,
        };
        data = await runAgent<SeoAuditAgentInput, SeoAuditAgentOutput>("seo-audit-agent", payload);
        break;
      }
      case "geo-audit": {
        const { url, businessName, focusAreas } = parsed.data.payload;
        const website = await fetchWebsite(url);
        const payload: GeoAuditAgentInput = {
          url: website.finalUrl,
          businessName,
          siteData: website.html.slice(0, 8000),
          focusAreas: focusAreas.join(","),
        };
        data = await runAgent<GeoAuditAgentInput, GeoAuditAgentOutput>("geo-audit-agent", payload);
        break;
      }
      case "schema": {
        const { url, businessType: requestedType } = parsed.data.payload;
        const website = await fetchWebsite(url);
        const $ = parseHtml(website.html);
        const metadata = extractMetadata($, website.finalUrl);
        const existingSchema = detectStructuredData($);
        const detectedType =
          requestedType === "auto" || requestedType === "Auto Detect"
            ? detectBusinessTypeDeterministic(metadata, existingSchema)
            : {
                type: requestedType as SchemaType,
                confidence: 1,
                signals: ["User selected: " + requestedType],
                method: "deterministic" as const,
              };
        const extractedMetadata = JSON.stringify(
          {
            title: metadata.title,
            description: metadata.description,
            headings: metadata.headings,
            openGraph: metadata.openGraph,
            contact: metadata.contact,
            socialProfiles: metadata.socialProfiles,
            textExcerpt: metadata.textContent.slice(0, 2000),
          },
          null,
          2,
        );
        const missingInformation: string[] = [];
        if (!metadata.contact.phone) missingInformation.push("phone number");
        if (!metadata.contact.email) missingInformation.push("email address");
        if (!metadata.contact.address) missingInformation.push("physical address");
        if (!metadata.contact.logo) missingInformation.push("logo image");
        if (!metadata.description) missingInformation.push("meta description");
        if (!metadata.headings.h1.length) missingInformation.push("H1 heading");
        if (!metadata.socialProfiles.length) missingInformation.push("social media profiles");
        if (!metadata.contact.openingHours.length) missingInformation.push("opening hours");

        registerSchemaPrompts(sharedPromptManager);
        const payload: SchemaAgentInput = {
          url: website.finalUrl,
          businessType: detectedType.type,
          extractedMetadata,
          existingSchema:
            existingSchema
              .filter((schema) => schema.valid)
              .map((schema) => schema.raw)
              .join("\n") || "No existing structured data found",
          missingInformation,
        };
        const generated = await runAgent<SchemaAgentInput, SchemaAgentOutput>(
          "schema-agent",
          payload,
        );
        data = {
          schema: generated.generatedSchema,
          businessType: detectedType.type,
          validation: validateSchema(generated.generatedSchema),
          reasoning: generated.reasoning,
          omittedProperties: generated.omittedProperties,
          readability: analyzeReadability(metadata, existingSchema),
          missingInformation,
        };
        break;
      }
      case "lead-qualification":
        data = await runAgent<LeadQualificationInput, LeadQualificationOutput>(
          "lead-qualification-agent",
          parsed.data.payload,
        );
        break;
      case "lead-outreach": {
        const engine = createEngine();
        const agent = new LeadQualificationAgent();
        const payload: LeadOutreachInput = parsed.data.payload;
        const result: LeadOutreachOutput = await agent.generateOutreach(payload, {
          providerManager: engine.providerManager,
        });
        data = result;
        break;
      }
      case "general":
        data = await runAgent<GeneralAgentInput, GeneralAgentOutput>(
          "general-agent",
          parsed.data.payload,
        );
        break;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}
