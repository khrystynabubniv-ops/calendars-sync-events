export type NotionPage = {
  id: string;
  url?: string;
  archived?: boolean;
  in_trash?: boolean;
  parent?: {
    type?: string;
    data_source_id?: string;
    database_id?: string;
    page_id?: string;
  };
  properties: Record<string, NotionProperty>;
};

export type NotionProperty = {
  id?: string;
  type: string;
  title?: Array<{ plain_text?: string; text?: { content?: string } }>;
  rich_text?: Array<{ plain_text?: string; text?: { content?: string } }>;
  checkbox?: boolean;
  date?: { start: string; end?: string | null; time_zone?: string | null } | null;
  select?: { name: string } | null;
  multi_select?: Array<{ name: string }>;
  people?: Array<{ object?: "user"; id: string }>;
  number?: number | null;
  status?: { name: string } | null;
  url?: string | null;
};

export type QueryResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

export class NotionApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
  }
}

export class NotionClient {
  constructor(
    private readonly token: string,
    private readonly notionVersion: string,
  ) {}

  async retrievePage(pageId: string): Promise<NotionPage> {
    return this.request<NotionPage>("GET", `/v1/pages/${pageId}`);
  }

  async queryDataSource(
    dataSourceId: string,
    body: Record<string, unknown>,
  ): Promise<QueryResponse> {
    return this.request<QueryResponse>(
      "POST",
      `/v1/data_sources/${dataSourceId}/query`,
      body,
    );
  }

  async createPage(
    dataSourceId: string,
    properties: Record<string, unknown>,
  ): Promise<NotionPage> {
    return this.request<NotionPage>("POST", "/v1/pages", {
      parent: { data_source_id: dataSourceId },
      properties,
    });
  }

  async updatePage(
    pageId: string,
    properties: Record<string, unknown>,
  ): Promise<NotionPage> {
    return this.request<NotionPage>("PATCH", `/v1/pages/${pageId}`, {
      properties,
    });
  }

  private async request<T>(
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`https://api.notion.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "Notion-Version": this.notionVersion,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new NotionApiError(
        `Notion API request failed: ${method} ${path}`,
        response.status,
        responseBody,
      );
    }

    return (await response.json()) as T;
  }
}

export function normalizeNotionId(id: string): string {
  return id.replaceAll("-", "").toLowerCase();
}
