import json
import re

# Read the logs.txt file
with open(r"c:\Users\parve\Desktop\logs.txt", "r") as f:
    content = f.read()

lines = content.split("\n")
logs = []
current_log = None
current_entries = []


def parse_time(time_str):
    if time_str == "N/A":
        return None
    if "mins" in time_str:
        mins = int(time_str.split()[0])
        return round(mins / 60.0, 2)
    elif "hr" in time_str:
        return float(time_str.split()[0])
    elif "hrs" in time_str:
        return float(time_str.split()[0])
    else:
        return None


def get_activity(subject):
    subject_lower = subject.lower()
    if "meeting" in subject_lower or "discussion" in subject_lower:
        return "Meeting"
    elif "support" in subject_lower or "operational" in subject_lower:
        return "Support"
    else:
        return "Development"


i = 0
while i < len(lines):
    line = lines[i].strip()
    if not line:
        i += 1
        continue

    # Skip separator lines
    if "---" in line:
        i += 1
        continue

    # Check for date line
    date_match = re.match(
        r"^([A-Z][a-z]+) (\d+), (\d+) \(\d+ hrs(?: \d+ mins)?\)$", line
    )
    if date_match:
        # Save previous log if exists
        if current_log:
            current_log["entries"] = current_entries
            logs.append(current_log)

        month, day, year = date_match.groups()
        month_abbr = month.lower()[:3]
        date_str = f"{month_abbr}-{day.zfill(2)}-{year}"
        current_log = {"date": date_str, "entries": []}
        current_entries = []
        i += 1
        continue

    # Check for project line
    if line and line == line.upper() and any(c.isalpha() for c in line):
        project = line
        i += 1
        # Skip the -------------------
        while i < len(lines) and ("---" in lines[i] or not lines[i].strip()):
            i += 1
        # Now parse entries until next project or date
        while i < len(lines):
            entry_line = lines[i].strip()
            if not entry_line:
                i += 1
                continue
            if entry_line == entry_line.upper() and any(
                c.isalpha() for c in entry_line
            ):
                # Next project, break
                break
            date_match = re.match(
                r"^([A-Z][a-z]+) (\d+), (\d+) \(\d+ hrs(?: \d+ mins)?\)$", entry_line
            )
            if date_match:
                # Next date, break
                break

            # Parse entry
            if "(Break - " in entry_line and ", Worked - " in entry_line:
                parts = entry_line.rsplit("(Break - ", 1)
                subject = parts[0].strip()
                rest = parts[1]
                break_part, worked_part = rest.split(", Worked - ")
                break_str = break_part.strip()
                worked_str = worked_part.rstrip(")")

                break_hours = parse_time(break_str)
                duration_hours = parse_time(worked_str)

                activity = get_activity(subject)

                entry = {
                    "project": project,
                    "subject": subject,
                    "break_hours": break_hours,
                    "duration_hours": duration_hours,
                    "activity": activity,
                    "is_scrum": False,
                    "work_package_id": None,
                }
                current_entries.append(entry)

            i += 1
        continue

    i += 1

# Add the last log
if current_log:
    current_log["entries"] = current_entries
    logs.append(current_log)

# Output the JSON
output = {"logs": logs}
print(json.dumps(output, indent=4))
