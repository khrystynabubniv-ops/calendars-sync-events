import type { NotionProperty } from "./notion.js";
import {
  dateValue,
  multiSelectValues,
  peopleValues,
  richTextValue,
  selectValue,
  statusValue,
  titleValue,
} from "./properties.js";

type DesiredProperty = {
  title?: Array<{ text?: { content?: string } }>;
  rich_text?: Array<{ text?: { content?: string } }>;
  date?: { start: string; end?: string | null; time_zone?: string | null } | null;
  select?: { name: string } | null;
  status?: { name: string } | null;
  multi_select?: Array<{ name: string }>;
  people?: Array<{ id: string }>;
  url?: string | null;
};

function desiredText(
  parts: Array<{ text?: { content?: string } }> | undefined,
) {
  return (parts || []).map((part) => part.text?.content || "").join("").trim();
}

function sorted(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sameStringArray(left: string[], right: string[]) {
  const sortedLeft = sorted(left);
  const sortedRight = sorted(right);
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

function sameDate(
  existing: NotionProperty | undefined,
  desired: DesiredProperty["date"],
) {
  const current = dateValue(existing);
  return (
    (current?.start || null) === (desired?.start || null) &&
    (current?.end || null) === (desired?.end || null) &&
    (current?.time_zone || null) === (desired?.time_zone || null)
  );
}

export function propertyMatches(
  existing: NotionProperty | undefined,
  desired: DesiredProperty,
) {
  if ("title" in desired) {
    return titleValue(existing) === desiredText(desired.title);
  }

  if ("rich_text" in desired) {
    return richTextValue(existing) === desiredText(desired.rich_text);
  }

  if ("date" in desired) {
    return sameDate(existing, desired.date);
  }

  if ("select" in desired) {
    return selectValue(existing) === (desired.select?.name || null);
  }

  if ("status" in desired) {
    return statusValue(existing) === (desired.status?.name || null);
  }

  if ("multi_select" in desired) {
    return sameStringArray(
      multiSelectValues(existing),
      (desired.multi_select || []).map((option) => option.name),
    );
  }

  if ("people" in desired) {
    return sameStringArray(
      peopleValues(existing).map((person) => person.id),
      (desired.people || []).map((person) => person.id),
    );
  }

  if ("url" in desired) {
    return existing?.type === "url" && (existing.url || null) === (desired.url || null);
  }

  return false;
}

export function changedProperties(
  existingProperties: Record<string, NotionProperty>,
  desiredProperties: Record<string, unknown>,
) {
  const changes: Record<string, unknown> = {};

  for (const [key, desired] of Object.entries(desiredProperties)) {
    if (
      !propertyMatches(
        existingProperties[key],
        desired as DesiredProperty,
      )
    ) {
      changes[key] = desired;
    }
  }

  return changes;
}
