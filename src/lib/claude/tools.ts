// Tool schemas for the AI assistant's calendar/schedule actions. These mirror
// the ScheduledItem shape in @/lib/types and the CRUD functions in
// @/lib/supabase/scheduledItems.ts — tool_use calls are dispatched to those
// functions by runTool() in @/lib/claude/runTool.ts.

const recurrenceInputSchema = {
    "type": "object",
    "description": "Set to make this a repeating event. Omit for a one-off event.",
    "properties": {
        "frequency": {
            "type": "string",
            "enum": ["daily", "weekly", "biweekly", "monthly", "yearly", "custom"],
        },
        "endDate": {
            "type": "string",
            "format": "date",
            "description": "YYYY-MM-DD, inclusive. Omit for an indefinitely repeating event.",
        },
        "customDescription": {
            "type": "string",
            "description": "Free-text recurrence description, only used when frequency is \"custom\".",
        },
    },
    "required": ["frequency"],
};

export const tools = [
    {
        "name": "list_scheduled_items",
        "description": "List scheduled items (events) on the user's calendar, optionally narrowed to a date range. Use this to see what's on the schedule before creating, updating, or deleting anything.",
        "input_schema": {
            "type": "object",
            "properties": {
                "startDate": {
                    "type": "string",
                    "format": "date",
                    "description": "YYYY-MM-DD. Only return items on or after this date.",
                },
                "endDate": {
                    "type": "string",
                    "format": "date",
                    "description": "YYYY-MM-DD. Only return items on or before this date.",
                },
            },
        },
    },
    {
        "name": "get_scheduled_item",
        "description": "Fetch a single scheduled item by id, including its full recurrence rule (exceptions and per-occurrence overrides).",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
            },
            "required": ["id"],
        },
    },
    {
        "name": "create_scheduled_item",
        "description": "Create a new scheduled item (event) on the user's calendar.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "date": {
                    "type": "string",
                    "format": "date",
                    "description": "YYYY-MM-DD anchor date (the first occurrence, for recurring items).",
                },
                "allDay": {"type": "boolean"},
                "startTime": {
                    "type": "string",
                    "description": "\"HH:mm\", required unless allDay is true.",
                },
                "endTime": {"type": "string", "description": "\"HH:mm\""},
                "notes": {"type": "string"},
                "recurrence": recurrenceInputSchema,
            },
            "required": ["title", "date", "allDay"],
        },
    },
    {
        "name": "update_scheduled_item",
        "description": "Update fields on an existing scheduled item. Only the fields provided are changed; omitted fields keep their current value. To edit or delete a single occurrence of a recurring item instead of the whole series, use update_scheduled_item_occurrence or delete_scheduled_item_occurrence.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "title": {"type": "string"},
                "date": {"type": "string", "format": "date"},
                "allDay": {"type": "boolean"},
                "startTime": {"type": "string", "description": "\"HH:mm\""},
                "endTime": {"type": "string", "description": "\"HH:mm\""},
                "notes": {"type": "string"},
                "recurrence": recurrenceInputSchema,
            },
            "required": ["id"],
        },
    },
    {
        "name": "delete_scheduled_item",
        "description": "Delete a scheduled item and all of its occurrences (if recurring). To remove just one occurrence of a recurring item, use delete_scheduled_item_occurrence instead.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
            },
            "required": ["id"],
        },
    },
    {
        "name": "update_scheduled_item_occurrence",
        "description": "Override the title, timing, or notes for a single occurrence of a recurring scheduled item, leaving the rest of the series unchanged.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Id of the recurring scheduled item."},
                "occurrenceDate": {
                    "type": "string",
                    "format": "date",
                    "description": "YYYY-MM-DD date of the specific occurrence to override.",
                },
                "title": {"type": "string"},
                "allDay": {"type": "boolean"},
                "startTime": {"type": "string", "description": "\"HH:mm\""},
                "endTime": {"type": "string", "description": "\"HH:mm\""},
                "notes": {"type": "string"},
            },
            "required": ["id", "occurrenceDate", "title", "allDay"],
        },
    },
    {
        "name": "delete_scheduled_item_occurrence",
        "description": "Remove a single occurrence of a recurring scheduled item (\"this event only\"), leaving the rest of the series unchanged.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Id of the recurring scheduled item."},
                "occurrenceDate": {
                    "type": "string",
                    "format": "date",
                    "description": "YYYY-MM-DD date of the specific occurrence to delete.",
                },
            },
            "required": ["id", "occurrenceDate"],
        },
    },
    {
        "name": "delete_scheduled_item_occurrences",
        "description": "Remove multiple occurrences of a recurring scheduled item at once (e.g. \"skip the next 3 meetings\"), leaving the rest of the series unchanged. For a single occurrence, delete_scheduled_item_occurrence also works.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Id of the recurring scheduled item."},
                "occurrenceDates": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "format": "date",
                    },
                    "description": "YYYY-MM-DD dates of the specific occurrences to delete.",
                },
            },
            "required": ["id", "occurrenceDates"],
        },
    },
];
