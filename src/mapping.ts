import type { NotionPage } from "./notion.js";
import {
  dateProperty,
  dateValue,
  multiSelectProperty,
  multiSelectValues,
  numberValue,
  peopleProperty,
  peopleValues,
  richTextProperty,
  richTextValue,
  selectProperty,
  selectValue,
  statusProperty,
  statusValue,
  titleProperty,
  titleValue,
  urlProperty,
} from "./properties.js";

const activityTypeMap = new Map<string, string>([
  ["Ярмарка вакансій", "Ярмарки вакансій"],
  ["Стажування", "Стажування"],
  ["Хакатон", "Хакатон"],
  ["Зовнішній освітній проєкт", "Зовнішній освітній проєкт"],
  ["Конференція", "Конференція"],
]);

const formatMap = new Map<string, string>([
  ["Офлайн", "offline"],
  ["Онлайн", "online"],
  ["Гібрид", "offline+online"],
]);

const locationMap = new Map<string, string>([
  ["Київ", "Київ"],
  ["Варшава", "Варшава"],
  ["All", "All"],
]);

const statusMap = new Map<string, string>([
  ["To do", "Not started"],
  ["In progress", "In progress"],
  ["Comments", "In progress"],
  ["Ready", "Done"],
]);

function maybeAdd(
  properties: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  if (value !== undefined && value !== null) {
    properties[key] = value;
  }
}

function mapOne(map: Map<string, string>, value: string | null) {
  return value ? map.get(value) : undefined;
}

export function buildSeoCalendarProperties(sourcePage: NotionPage) {
  const source = sourcePage.properties;
  const eventDate = dateValue(source["Event date"]);
  if (!eventDate) {
    throw new Error(`Activity ${sourcePage.id} has no Event date`);
  }

  const properties: Record<string, unknown> = {
    "Назва події ": titleProperty(titleValue(source.Name) || "Untitled activity"),
    "Таймінг": dateProperty(eventDate),
    "Source Activity ID": richTextProperty(sourcePage.id),
    "Source Activity URL": urlProperty(sourcePage.url),
  };

  const businessValues = multiSelectValues(source.Businesses);
  if (businessValues.length > 0) {
    properties["Бізнеси "] = multiSelectProperty(businessValues);
  }

  const activityType = mapOne(
    activityTypeMap,
    selectValue(source["EB Activity Type"]),
  );
  maybeAdd(
    properties,
    "Тип івенту ",
    activityType ? multiSelectProperty([activityType]) : undefined,
  );

  const format = mapOne(formatMap, selectValue(source["EB Format"]));
  maybeAdd(properties, "Формат", format ? multiSelectProperty([format]) : undefined);

  const location = mapOne(locationMap, selectValue(source["EB Location"]));
  maybeAdd(
    properties,
    "Локація",
    location ? multiSelectProperty([location]) : undefined,
  );

  const goal = selectValue(source["EB Goal"]);
  maybeAdd(properties, "Ціль ", goal ? selectProperty(goal) : undefined);

  const role = selectValue(source["EB Role"]);
  maybeAdd(properties, "Хто ми тут?", role ? selectProperty(role) : undefined);

  const audience = selectValue(source["EB Audience"]);
  maybeAdd(
    properties,
    "Цільова аудиторія",
    audience ? selectProperty(audience) : undefined,
  );

  const owner = peopleValues(source.Owner);
  if (owner.length > 0) {
    properties["Менеджер "] = peopleProperty(owner);
  }

  const recruiters = peopleValues(source["Recruiter assigned"]);
  if (recruiters.length > 0) {
    properties["Рекрутер "] = peopleProperty(recruiters);
  }

  const recruitersCount = richTextValue(source["Рекрутер (кількість)"]);
  maybeAdd(
    properties,
    "Кількість рекрутерів",
    recruitersCount ? richTextProperty(recruitersCount) : undefined,
  );

  const merch = numberValue(source["Мерч"]);
  maybeAdd(
    properties,
    "Мерч",
    merch !== null ? richTextProperty(String(merch)) : undefined,
  );

  const status = mapOne(statusMap, statusValue(source.Status));
  maybeAdd(properties, "Статус", status ? statusProperty(status) : undefined);

  return properties;
}

export function skippedActivityType(sourcePage: NotionPage): string | null {
  const value = selectValue(sourcePage.properties["EB Activity Type"]);
  return value && !activityTypeMap.has(value) ? value : null;
}
