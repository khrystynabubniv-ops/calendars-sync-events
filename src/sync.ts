import type { AppConfig } from "./config.js";
import { changedProperties } from "./compare.js";
import { buildSeoCalendarProperties, skippedActivityType } from "./mapping.js";
import { normalizeNotionId, NotionClient, type NotionPage } from "./notion.js";
import { checkboxValue, dateValue, richTextProperty, selectValue } from "./properties.js";

export type SyncResult =
  | { status: "created"; sourcePageId: string; targetPageId: string }
  | { status: "updated"; sourcePageId: string; targetPageId: string }
  | { status: "unchanged"; sourcePageId: string; targetPageId: string }
  | { status: "skipped"; sourcePageId: string; reason: string };

function isSourceActivityPage(page: NotionPage, config: AppConfig): boolean {
  const parentId =
    page.parent?.data_source_id || page.parent?.database_id || page.parent?.page_id;
  return (
    Boolean(parentId) &&
    normalizeNotionId(parentId || "") ===
      normalizeNotionId(config.sourceActivitiesDataSourceId)
  );
}

function getEligibilitySkipReason(page: NotionPage, config: AppConfig) {
  if (page.archived || page.in_trash) {
    return "source page is archived or in trash";
  }

  if (!isSourceActivityPage(page, config)) {
    return "page does not belong to the Activities data source";
  }

  if (selectValue(page.properties.Team) !== "EB") {
    return "Team is not EB";
  }

  if (!checkboxValue(page.properties["CEO calendar"])) {
    return "CEO calendar is not checked";
  }

  if (!dateValue(page.properties["Event date"])) {
    return "Event date is empty";
  }

  return null;
}

async function findExistingSeoPage(
  notion: NotionClient,
  config: AppConfig,
  sourcePageId: string,
) {
  const response = await notion.queryDataSource(config.seoCalendarDataSourceId, {
    page_size: 1,
    filter: {
      property: "Source Activity ID",
      rich_text: {
        equals: sourcePageId,
      },
    },
  });

  return response.results[0] || null;
}

export async function syncActivityPage(
  notion: NotionClient,
  config: AppConfig,
  pageId: string,
): Promise<SyncResult> {
  const sourcePage = await notion.retrievePage(pageId);
  return syncActivityPageObject(notion, config, sourcePage);
}

export async function syncActivityPageObject(
  notion: NotionClient,
  config: AppConfig,
  sourcePage: NotionPage,
): Promise<SyncResult> {
  const skipReason = getEligibilitySkipReason(sourcePage, config);
  if (skipReason) {
    return {
      status: "skipped",
      sourcePageId: sourcePage.id,
      reason: skipReason,
    };
  }

  const skippedType = skippedActivityType(sourcePage);
  if (skippedType) {
    console.info(
      `Skipping unsupported EB Activity Type "${skippedType}" for ${sourcePage.id}`,
    );
  }

  const properties = buildSeoCalendarProperties(sourcePage);
  const existingSeoPage = await findExistingSeoPage(
    notion,
    config,
    sourcePage.id,
  );

  if (existingSeoPage) {
    const changes = changedProperties(existingSeoPage.properties, properties);
    if (Object.keys(changes).length === 0) {
      return {
        status: "unchanged",
        sourcePageId: sourcePage.id,
        targetPageId: existingSeoPage.id,
      };
    }

    const updatedPage = await notion.updatePage(existingSeoPage.id, changes);
    return {
      status: "updated",
      sourcePageId: sourcePage.id,
      targetPageId: updatedPage.id,
    };
  }

  const createdPage = await notion.createPage(
    config.seoCalendarDataSourceId,
    properties,
  );

  return {
    status: "created",
    sourcePageId: sourcePage.id,
    targetPageId: createdPage.id,
  };
}

export async function backfillEligibleActivities(
  notion: NotionClient,
  config: AppConfig,
) {
  const results: SyncResult[] = [];
  let startCursor: string | null = null;

  do {
    const response = await notion.queryDataSource(config.sourceActivitiesDataSourceId, {
      page_size: 50,
      ...(startCursor ? { start_cursor: startCursor } : {}),
      filter: {
        and: [
          {
            property: "Team",
            select: {
              equals: "EB",
            },
          },
          {
            property: "CEO calendar",
            checkbox: {
              equals: true,
            },
          },
          {
            property: "Event date",
            date: {
              is_not_empty: true,
            },
          },
        ],
      },
    });

    for (const page of response.results) {
      results.push(await syncActivityPageObject(notion, config, page));
    }

    startCursor = response.next_cursor;
  } while (startCursor);

  return results;
}

export function sourceActivityIdProperty(pageId: string) {
  return richTextProperty(pageId);
}
