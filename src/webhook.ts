import { createHmac, timingSafeEqual } from "node:crypto";
import type { AppConfig } from "./config.js";
import { backfillEligibleActivities, syncActivityPage } from "./sync.js";
import { normalizeNotionId, NotionClient } from "./notion.js";

export type NotionWebhookEvent = {
  type?: string;
  entity?: {
    id?: string;
    type?: string;
  };
  verification_token?: string;
};

export function verifyNotionSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  verificationToken: string | undefined,
) {
  if (!verificationToken) {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = `sha256=${createHmac("sha256", verificationToken)
    .update(rawBody)
    .digest("hex")}`;

  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signatureHeader);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function handleNotionWebhook(
  event: NotionWebhookEvent,
  notion: NotionClient,
  config: AppConfig,
) {
  if (event.verification_token) {
    console.info("Received Notion webhook verification token.");
    return;
  }

  if (
    (event.type === "page.created" ||
      event.type === "page.properties_updated" ||
      event.type === "page.moved" ||
      event.type === "page.undeleted") &&
    event.entity?.type === "page" &&
    event.entity.id
  ) {
    const result = await syncActivityPage(notion, config, event.entity.id);
    console.info("Notion page sync result", result);
    return;
  }

  if (
    event.type === "data_source.content_updated" &&
    event.entity?.type === "data_source" &&
    event.entity.id &&
    normalizeNotionId(event.entity.id) ===
      normalizeNotionId(config.sourceActivitiesDataSourceId)
  ) {
    const results = await backfillEligibleActivities(notion, config);
    console.info(`Backfilled ${results.length} eligible Activities rows.`);
    return;
  }

  console.info(`Ignoring Notion webhook event type: ${event.type || "unknown"}`);
}
