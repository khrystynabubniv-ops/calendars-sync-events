import type { NotionProperty } from "./notion.js";

export function checkboxValue(property: NotionProperty | undefined): boolean {
  return property?.type === "checkbox" && property.checkbox === true;
}

export function titleValue(property: NotionProperty | undefined): string {
  if (property?.type !== "title") {
    return "";
  }

  return (property.title || [])
    .map((part) => part.plain_text || part.text?.content || "")
    .join("")
    .trim();
}

export function richTextValue(property: NotionProperty | undefined): string {
  if (property?.type !== "rich_text") {
    return "";
  }

  return (property.rich_text || [])
    .map((part) => part.plain_text || part.text?.content || "")
    .join("")
    .trim();
}

export function dateValue(property: NotionProperty | undefined) {
  if (property?.type !== "date") {
    return null;
  }

  return property.date || null;
}

export function selectValue(property: NotionProperty | undefined): string | null {
  if (property?.type !== "select") {
    return null;
  }

  return property.select?.name || null;
}

export function statusValue(property: NotionProperty | undefined): string | null {
  if (property?.type !== "status") {
    return null;
  }

  return property.status?.name || null;
}

export function multiSelectValues(
  property: NotionProperty | undefined,
): string[] {
  if (property?.type !== "multi_select") {
    return [];
  }

  return (property.multi_select || []).map((option) => option.name);
}

export function peopleValues(property: NotionProperty | undefined) {
  if (property?.type !== "people") {
    return [];
  }

  return (property.people || []).map((person) => ({
    object: "user",
    id: person.id,
  }));
}

export function numberValue(property: NotionProperty | undefined): number | null {
  if (property?.type !== "number") {
    return null;
  }

  return property.number ?? null;
}

export function titleProperty(value: string) {
  return {
    title: [
      {
        text: {
          content: value.slice(0, 2000),
        },
      },
    ],
  };
}

export function richTextProperty(value: string) {
  return {
    rich_text: value
      ? [
          {
            text: {
              content: value.slice(0, 2000),
            },
          },
        ]
      : [],
  };
}

export function urlProperty(value: string | undefined) {
  return {
    url: value || null,
  };
}

export function dateProperty(date: {
  start: string;
  end?: string | null;
  time_zone?: string | null;
}) {
  return {
    date: {
      start: date.start,
      ...(date.end ? { end: date.end } : {}),
      ...(date.time_zone ? { time_zone: date.time_zone } : {}),
    },
  };
}

export function selectProperty(value: string) {
  return {
    select: {
      name: value,
    },
  };
}

export function statusProperty(value: string) {
  return {
    status: {
      name: value,
    },
  };
}

export function multiSelectProperty(values: string[]) {
  return {
    multi_select: values.map((name) => ({ name })),
  };
}

export function peopleProperty(values: Array<{ object: string; id: string }>) {
  return {
    people: values,
  };
}
