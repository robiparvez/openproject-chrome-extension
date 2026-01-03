# OpenProject Time Logger — Quick Reference

Lightweight Chrome extension (plus optional Python scripts) to upload structured JSON work logs and create/link OpenProject work packages and time entries.

## What it does

- Parse multi-date JSON work logs
- Validate structure, dates and required fields locally
- Detect same-date duplicates (blocks upload)
- Aggregate same-subject tasks across different dates (informational)
- Create or link work packages and create time entries with calculated start/end times

## Quick Start

1. Open `chrome://extensions/`, enable Developer mode and choose *Load unpacked* → select this repo
2. Open Options and add your OpenProject API token (Step 1)
3. Download sample JSON or upload your own (Step 2), confirm per-date start times, then review (Step 3)

## Minimal JSON example

```json
{
    "logs": [
        {
            "date": "nov-23-2025",
            "entries": [
                {
                    "project": "BD-TICKET",
                    "subject": "Requirement analysis",
                    "break_hours": null,
                    "duration_hours": 2,
                    "activity": "Development",
                    "is_scrum": false,
                    "work_package_id": null
                }
            ]
        }
    ]
}
```

## Key features

- Multi-date uploads and timeline view
- Same-date duplicate validation (blocks upload)
- Server-side duplicate checks before creating work packages
- Time chaining with break handling and 12-hour display
- Auto-comments with start/end times and batch processing

## Troubleshooting

- Invalid JSON → fix structure/fields
- Date format must be `month-day-year` (e.g., `nov-23-2025`)
- Same-date duplicate → combine entries or change subject
- API/auth errors → check token and project permissions

## Developer notes

- Core code: `shared/parser.js`, `shared/workLogService.js`, `shared/apiClient.js`
- UI: `options/` (stepper, upload, toasts)
- Background: `background/service-worker.js`
- Tests & diagnostics: `script/test_api.py`

---
For more details, inspect the source files in this repository.

### Python Script Usage

1. Copy `script/config.template.py` to `script/config.py`
2. Fill in your OpenProject credentials and settings
3. Run `python script/test_api.py` to validate configuration and permissions
4. Use the script to retrieve current project mappings from your OpenProject instance

The script tests:

- API connectivity and authentication
- Access to configured projects
- Permissions for creating work packages and time entries
- Validity of user IDs for accountable/assignee fields

## 🔗 Related Resources

- [OpenProject API Documentation](https://www.openproject.org/docs/api/)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
