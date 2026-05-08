import express from "express";
import type { AppConfig } from "./config.js";
import { NotionClient } from "./notion.js";
import { backfillEligibleActivities } from "./sync.js";
import { handleNotionWebhook, verifyNotionSignature } from "./webhook.js";

declare module "http" {
  interface IncomingMessage {
    rawBody?: string;
  }
}

function isAuthorizedAdminRequest(
  request: express.Request,
  config: AppConfig,
) {
  if (!config.syncAdminToken) {
    return false;
  }

  const authorization = request.header("authorization");
  const syncToken = request.header("x-sync-token");
  return (
    syncToken === config.syncAdminToken ||
    authorization === `Bearer ${config.syncAdminToken}`
  );
}

export function createApp(config: AppConfig) {
  const app = express();
  const notion = config.notionToken
    ? new NotionClient(config.notionToken, config.notionVersion)
    : null;

  app.use(
    express.json({
      verify: (request, _response, buffer) => {
        request.rawBody = buffer.toString("utf8");
      },
    }),
  );

  app.get("/healthz", (_request, response) => {
    response.json({ ok: true });
  });

  app.post("/webhooks/notion", (request, response) => {
    const rawBody = request.rawBody || JSON.stringify(request.body || {});
    const signature = request.header("x-notion-signature");

    if (
      !verifyNotionSignature(
        rawBody,
        signature,
        config.notionWebhookVerificationToken,
      )
    ) {
      response.status(401).json({ ok: false });
      return;
    }

    if (request.body?.verification_token) {
      console.info(
        `Notion webhook verification token: ${request.body.verification_token}`,
      );
      response.json({
        ok: true,
        verification_token: request.body.verification_token,
      });
      return;
    }

    if (!notion) {
      response.status(503).json({
        ok: false,
        error: "NOTION_TOKEN is not configured",
      });
      return;
    }

    response.status(202).json({ ok: true });

    void handleNotionWebhook(request.body, notion, config).catch((error) => {
      console.error("Failed to handle Notion webhook", error);
    });
  });

  app.post("/jobs/backfill", async (request, response) => {
    if (!isAuthorizedAdminRequest(request, config)) {
      response.status(401).json({ ok: false });
      return;
    }

    if (!notion) {
      response.status(503).json({
        ok: false,
        error: "NOTION_TOKEN is not configured",
      });
      return;
    }

    const results = await backfillEligibleActivities(notion, config);
    response.json({ ok: true, results });
  });

  return app;
}
