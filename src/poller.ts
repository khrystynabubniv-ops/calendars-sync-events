import type { AppConfig } from "./config.js";
import { NotionClient } from "./notion.js";
import { backfillEligibleActivities, type SyncResult } from "./sync.js";

function summarize(results: SyncResult[]) {
  return results.reduce(
    (summary, result) => {
      summary[result.status] += 1;
      return summary;
    },
    {
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
    },
  );
}

export function startPolling(config: AppConfig) {
  if (!config.enablePolling) {
    console.info("Polling is disabled.");
    return;
  }

  if (!config.notionToken) {
    console.warn("Polling is disabled because NOTION_TOKEN is not configured.");
    return;
  }

  const notion = new NotionClient(config.notionToken, config.notionVersion);
  let isRunning = false;

  async function runOnce() {
    if (isRunning) {
      console.info("Skipping polling tick because the previous tick is still running.");
      return;
    }

    isRunning = true;
    try {
      const results = await backfillEligibleActivities(notion, config);
      const summary = summarize(results);
      console.info("Polling sync complete", summary);
    } catch (error) {
      console.error("Polling sync failed", error);
    } finally {
      isRunning = false;
    }
  }

  console.info(`Polling is enabled every ${config.pollIntervalMs}ms.`);
  void runOnce();
  setInterval(() => void runOnce(), config.pollIntervalMs);
}
