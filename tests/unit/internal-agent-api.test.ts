import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/internal/agents/route";

const originalToken = process.env.AI_SERVICE_TOKEN;

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.AI_SERVICE_TOKEN;
  } else {
    process.env.AI_SERVICE_TOKEN = originalToken;
  }
});

function createRequest(token?: string, body: unknown = {}): Request {
  return new Request("http://localhost/api/internal/agents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/internal/agents", () => {
  it("returns service unavailable when the shared token is not configured", async () => {
    delete process.env.AI_SERVICE_TOKEN;

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
  });

  it("rejects callers without the shared service token", async () => {
    process.env.AI_SERVICE_TOKEN = "a".repeat(32);

    const response = await POST(createRequest("wrong-token"));

    expect(response.status).toBe(401);
  });

  it("validates the agent request after authenticating the service", async () => {
    const token = "a".repeat(32);
    process.env.AI_SERVICE_TOKEN = token;

    const response = await POST(createRequest(token, { agent: "unknown", payload: {} }));

    expect(response.status).toBe(422);
  });
});
