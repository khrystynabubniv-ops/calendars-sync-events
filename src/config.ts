export type AppConfig = {
  notionToken: string;
  notionVersion: string;
  sourceActivitiesDataSourceId: string;
  seoCalendarDataSourceId: string;
  notionWebhookVerificationToken?: string;
  syncAdminToken?: string;
  port: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function readConfig(): AppConfig {
  return {
    notionToken: requiredEnv("NOTION_TOKEN"),
    notionVersion: process.env.NOTION_VERSION || "2026-03-11",
    sourceActivitiesDataSourceId:
      process.env.SOURCE_ACTIVITIES_DATA_SOURCE_ID ||
      "040fac81-5162-43ee-ad31-e19479696ba3",
    seoCalendarDataSourceId:
      process.env.SEO_CALENDAR_DATA_SOURCE_ID ||
      "2a2ce989-9cb7-804f-b66f-000b0b58be12",
    notionWebhookVerificationToken:
      process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN || undefined,
    syncAdminToken: process.env.SYNC_ADMIN_TOKEN || undefined,
    port: Number(process.env.PORT || 3000),
  };
}
