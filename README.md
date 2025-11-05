# OpenProject Time Logger - Chrome Extension

A comprehensive Chrome extension and Python toolset for streamlining time logging to OpenProject. Upload JSON-formatted work logs, automatically create work packages, and log time entries with intelligent start/end time calculations and duplicate detection.

## 🌟 Overview

This project provides both a Chrome extension and Python scripts that transform time logging from a manual, time-consuming process into an automated workflow. Simply prepare your work logs in JSON format, upload them through the extension or run the Python script, and let it handle the complexity of:

- Creating new work packages or finding existing ones
- Calculating accurate start and end times based on task duration and breaks
- Handling multi-date work logs across different projects
- Displaying comprehensive timelines with total hours per day
- Adding detailed time entries with start/finish times in comments
- Intelligent duplicate detection and work package linking

## ✨ Key Features

### 📋 **Smart Work Log Processing**

- **Multi-Date Support**: Process work logs spanning multiple dates in a single upload
- **Automatic Work Package Management**: Creates new work packages or links to existing ones based on subject matching
- **Intelligent Duplicate Detection**: Scans existing work packages to prevent duplicates
- **SCRUM Entry Handling**: Special handling for daily scrum/meeting entries with fixed time slots

### ⏱️ **Advanced Time Management**

- **Start Time Prompts**: Interactive prompts to set start times for the first task of each date
- **Break Time Calculation**: Automatically accounts for breaks between tasks
- **Time Chain Calculation**: Intelligently chains tasks together with proper timing
- **12-Hour Time Format**: User-friendly display with AM/PM notation
- **Timeline Visualization**: Beautiful timeline view showing all tasks with start/end times and total hours per day

### 🎯 **Robust Validation**

- **Pre-Upload Analysis**: Comprehensive validation before any API calls
- **Required Field Checking**: Ensures all mandatory fields are present
- **Project Mapping Verification**: Validates project names against configured mappings
- **Data Type Validation**: Checks duration hours, break hours, and other numeric fields
- **Date Format Validation**: Enforces correct date format (month-day-year)
- **🆕 Server Duplicate Detection**: Real-time validation against existing work packages on OpenProject server
  - Prevents creation of duplicate work packages with identical subjects
  - Configurable strict/non-strict validation modes
  - Suggests using existing work package IDs or modifying subjects
  - Example: If "Enhance KPI Management..." already exists, parser will throw validation error

### 📊 **Analysis & Review**

- **Entry Categorization**: Separate views for SCRUM entries, existing work packages, new entries, and duplicates
- **Summary Statistics**: Total entries, date count, total hours, and date range
- **Work Package Details**: Shows work package IDs and subjects for existing entries
- **Comment & Status Management**: Allows adding comments and setting status for new work packages
- **Visual Timeline**: Card-based timeline with project badges, SCRUM indicators, and hour totals

### 🔄 **Seamless API Integration**

- **OpenProject API v3**: Full compatibility with OpenProject's latest API
- **Auto-Project Fetching**: Dynamically loads available projects from your OpenProject instance
- **Status Management**: Fetches and allows selection of work package statuses
- **Batch Processing**: Efficiently processes multiple entries with progress tracking
- **Error Handling**: Comprehensive error messages and recovery options

## 📦 Installation & Setup

### Prerequisites

- **Google Chrome** or Chromium-based browser
- **OpenProject** instance with API v3 access
- **Valid OpenProject Access Token** with permissions for:
  - Creating work packages
  - Creating time entries
  - Reading projects and users
- **Python 3.11+** (for standalone Python script)
- **UV** (Python package manager) - [Install UV](https://docs.astral.sh/uv/)

### Chrome Extension Setup

1. **Download & Navigate To Extension**

   ```bash
   cd openproject-chrome-extension
   ```

2. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `openproject-chrome-extension` folder (root directory)

3. **Verify Installation**
   - Extension icon should appear in Chrome toolbar
   - Click icon and select **Options** to open configuration interface

### Python Script Setup

1. **Navigate to Script Directory**

   ```bash
   cd script/
   ```

2. **Initialize Python Environment**

   ```bash
   # Install UV if not already installed
   curl -LsSf https://astral.sh/uv/install.sh | sh

   # Initialize project and install dependencies
   uv sync
   ```

3. **Configure API Credentials**

   ```bash
   # Copy template and edit with your credentials
   cp config.template.py config.py
   ```

   Edit `config.py` and add your:
   - OpenProject Access Token
   - User IDs (accountable_user_id, assignee_user_id)
   - Base URL (if different from default)

4. **Test API Connection**

   ```bash
   # Verify connectivity and permissions
   uv run python test_api.py
   ```

   This validates:
   - API connectivity and authentication
   - Project access permissions
   - Work package creation permissions
   - Time entry creation permissions
   - User permissions and fetches suggested project mappings

## 🔧 Configuration

### Chrome Extension Configuration

1. **Open Extension Options**
   - Click the extension icon in Chrome toolbar
   - Select **Options** to open the configuration interface
   - You'll see a 4-step stepper workflow: Configuration → Upload Logs → Process & Review → Complete

2. **Step 1: Configure API Connection**
   - Enter your **OpenProject Access Token**
     - Get it from: OpenProject → My Account → Access tokens → Generate
     - Ensure token has permissions for work packages and time entries
   - **Base URL** is pre-configured but can be modified if needed
   - Click **Save & Test Connection**
     - ✅ Success: Projects will be automatically loaded
     - ❌ Failure: Check token validity and OpenProject URL

3. **Project Mappings**
   - Projects are automatically fetched from your OpenProject instance
   - Current pre-configured mappings include common projects
   - View available projects by clicking **📋 Projects** button
   - Mappings are stored in `shared/config.js` and can be modified

### Python Script Configuration

1. **Configure Credentials** (in `script/` directory)

   ```bash
   # Copy template and edit
   cp config.template.py config.py
   ```

2. **Edit config.py** with your details:

   ```python
   CONFIG = {
       "base_url": "https://your-openproject-domain.com",
       "api_token": "your_access_token_here",
       "accountable_user_id": '',  # Your user ID
       "assignee_user_id": '',     # Your user ID
   }
   ```

3. **Run Test Script**

   ```bash
   # From script/ directory
   uv run python test_api.py
   ```

### Available Project Mappings

The system comes with pre-configured project mappings for common projects. Use these exact names in your JSON files:

- **BD-TICKET** → 151
- **COMMON-SLASH-LEARNING-AND-UPSKILLING** → 141
- **COMMON-SLASH-RFS-AND-DEMO-SUPPORT** → 140
- **COMMON-SLASH-RESEARCH-AND-DEVELOPMENT-R-AND-D** → 138
- **COMMON-SLASH-GENERAL-PURPOSE-AND-MEETINGS-HR-ACTIVITY** → 132
- **ELEARNING** → 130
- **INFO360-1** → 129
- **GENERAL-PROJECT-TASKS-MEETING-AND-SCRUM** → 115
- **ROBI-HR4U** → 68
- **JBL** → 67
- **CBL** → 66
- **SEBL** → 65
- **IDCOL** → 64
- **HRIS** → 63
- **NEXT-GENERATION-PROVISING-SYSTEM-NGPS** → 41
- **IOT-AND-FWA** → 21

*To modify project mappings, update the `PROJECT_MAPPINGS` in `shared/config.js` or `script/config.py`.*

## 📝 Usage Guide

### Option 1: Chrome Extension Workflow

#### Step 1: Upload Logs

- Open the extension options (click extension icon → Options)
- Navigate to **Step 2: Upload Logs**
- Drag & drop or click to select your JSON file
- File is automatically validated for structure and required fields

#### Step 2: Set Start Times

- For each date with non-SCRUM entries, you'll be prompted to set a start time
- Choose hour, minute, and AM/PM using the interactive time picker
- Click **✅ Confirm Start Time**
- The system automatically calculates all subsequent task times based on duration and breaks

#### Step 3: Review Analysis

The extension categorizes your entries into different sections:

- **📅 Timeline**: Visual timeline showing all tasks with start/end times and totals
- **🎯 SCRUM Entries**: Daily scrums and meetings (require existing work_package_id)
- **✅ Existing Work Packages**: Entries with valid work_package_id
- **➕ New Entries**: Tasks that will create new work packages
- **⚠️ Duplicates Found**: Matching work packages found in OpenProject

#### Step 4: Add Comments & Status (Optional)

- Add descriptive comments for new work packages
- Select work package status (default: New)
- Comments and status help with work package organization and tracking

#### Step 5: Process Entries

- Click **🚀 Process All Entries**
- Watch real-time progress with detailed status updates
- Review results showing created vs updated entries

#### Step 6: Complete

- View comprehensive success/failure statistics
- See count of created vs updated work packages and time entries
- Option to upload another file or close the extension

### Option 2: Python Script Usage

#### Command Line Interface

```bash
# From script/ directory
uv run python main.py

# Or with direct execution
python main.py
```

#### Interactive Workflow

1. **File Selection**: Choose your JSON work log file
2. **Validation**: Automatic validation of file structure and data
3. **Time Configuration**: Set start times for each date
4. **Processing**: Automated work package and time entry creation
5. **Results**: Detailed summary of operations performed

### Creating Your Work Log JSON

Your work log must follow this structure:

```json
{
    "logs": [
        {
            "date": "oct-23-2025",
            "entries": [
                {
                    "project": "IDCOL",
                    "subject": "If any changes are made by HR after approval is completed, notifications will be sent to all approvers",
                    "break_hours": null,
                    "duration_hours": 3,
                    "activity": "Development",
                    "is_scrum": false,
                    "work_package_id": 9301
                },
                {
                    "project": "IDCOL",
                    "subject": "Sync all the fields (candidate education, experience, certification & training module) of candidate portal with admin portal",
                    "break_hours": 0.5,
                    "duration_hours": 4,
                    "activity": "Development",
                    "is_scrum": false,
                    "work_package_id": null
                }
            ]
        },
        {
            "date": "oct-27-2025",
            "entries": [
                {
                    "project": "IDCOL",
                    "subject": "Operation support for Leave & Attendance",
                    "break_hours": null,
                    "duration_hours": 4.5,
                    "activity": "Support",
                    "is_scrum": false,
                    "work_package_id": null
                },
                {
                    "project": "IDCOL",
                    "subject": "KPI Changes Clarification Meeting",
                    "break_hours": 0.25,
                    "duration_hours": 2.5,
                    "activity": "Meeting",
                    "is_scrum": false,
                    "work_package_id": null
                }
            ]
        }
    ]
}
```

#### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `date` | string | Date in `month-day-year` format | `"oct-9-2025"` |
| `project` | string | Project name from mappings | `"IDCOL"` |
| `subject` | string | Work description | `"Fix login bug"` |
| `duration_hours` | number | Time spent in hours | `2.5` |
| `activity` | string | Activity type | `"Development"` |
| `is_scrum` | boolean | Is this a SCRUM/meeting entry? | `false` |

#### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `work_package_id` | number/null | Existing work package ID | `null` |
| `break_hours` | number/null | Break time in hours | `null` |

#### Supported Activities

- **Development** (Software development work)
- **Support** (Support and maintenance)
- **Meeting** (Meetings and discussions)
- **Testing** (QA and testing activities)
- **Specification** (Requirements and documentation)
- **Management** (Administrative tasks)
- **Change Request** (CR implementation)
- **Other** (Miscellaneous work)

## 🎨 Timeline Feature

The extension includes a beautiful timeline visualization that shows:

### Per-Date Display

- **Date Header**: Day, month, date, and year
- **Total Hours Badge**: Total hours worked that day
- **Task Cards**: Each task showing:
  - Project name badge
  - SCRUM badge (if applicable)
  - Task description
  - Start and end times (12-hour format)
  - Duration badge

### Multi-Date Summary

- **Grand Total**: Total hours across all dates
- **Number of Days**: Total days in the work log
- **Visual Hierarchy**: Easy to scan and verify

### Example Timeline Display

```text
📅 Wed, Oct 23, 2025                          Total: 7h
┌─────────────────────────────────────────────────────────┐
│ IDCOL  Development                    11:00 AM - 2:00 PM │
│ HR approval notification              3h                 │
├─────────────────────────────────────────────────────────┤
│ IDCOL  Development                    2:30 PM - 6:30 PM  │
│ Candidate portal sync                 4h                 │
└─────────────────────────────────────────────────────────┘

📅 Sun, Oct 27, 2025                          Total: 7h
┌─────────────────────────────────────────────────────────┐
│ IDCOL  Support                        9:00 AM - 1:30 PM  │
│ Leave & Attendance support            4.5h               │
├─────────────────────────────────────────────────────────┤
│ IDCOL  Meeting                        1:45 PM - 4:15 PM  │
│ KPI Changes Clarification             2.5h               │
└─────────────────────────────────────────────────────────┘

⏱️ Grand Total (2 days): 14h
```

## 🔍 How It Works

### Entry Processing Flow

1. **Parse JSON**: Validate structure and required fields
2. **Check Start Times**: Prompt user for first task start time per date
3. **Calculate Times**: Chain tasks together with breaks
4. **Analyze Entries**: Categorize and check for duplicates
5. **Create/Link Work Packages**:
   - SCRUM entries → Link to existing work package
   - Has work_package_id → Use existing
   - No work_package_id → Check for duplicates → Create new if needed
6. **Create Time Entries**: Add time with start/finish times in comment

### Time Calculation Logic

For each date:

1. **First Non-SCRUM Task**: User sets start time (e.g., 11:00 AM)
2. **Subsequent Tasks**:
   - End of previous task + break hours = Start of next task
   - Start + duration = End time
3. **SCRUM Entries**: Fixed timing (10:00 AM default), don't affect chain

### Example Time Chain

```text
Task 1: 11:00 AM - 1:30 PM (2.5h)
Break: 20 minutes (0.33h)
Task 2: 1:50 PM - 6:20 PM (4.5h)
```

## 🐛 Troubleshooting

### Chrome Extension Issues

**Problem**: "Failed to connect to OpenProject"

- ✅ Verify your Access Token is valid and not expired
- ✅ Check that base URL in `shared/config.js` matches your OpenProject instance
- ✅ Ensure your OpenProject instance is accessible from your network
- ✅ Confirm API v3 is enabled on your OpenProject instance
- ✅ Test with the Python script: `uv run python script/test_api.py`

**Problem**: "Authentication failed"

- ✅ Regenerate your Access Token in OpenProject (My Account → Access tokens)
- ✅ Ensure token has required permissions (work packages, time entries)
- ✅ Copy token exactly without extra spaces or characters
- ✅ Check that your user account has necessary project permissions

**Problem**: "Extension not loading or options page blank"

- ✅ Reload the extension in `chrome://extensions/`
- ✅ Check browser console for JavaScript errors
- ✅ Ensure all files are present in the extension directory
- ✅ Try disabling and re-enabling the extension

### Upload & Processing Issues

**Problem**: "Project mapping not found"

- ✅ Check project name matches exactly in `PROJECT_MAPPINGS` (case-sensitive)
- ✅ Click **📋 Projects** button to view available projects
- ✅ Update `shared/config.js` with correct project mappings
- ✅ Run `uv run python script/test_api.py` to get suggested mappings

**Problem**: "SCRUM entry missing work_package_id"

- ✅ SCRUM entries (`is_scrum: true`) must have a valid `work_package_id`
- ✅ Find the work package ID in OpenProject for your scrum meetings
- ✅ Ensure the work package exists and is accessible
- ✅ Create a dedicated work package for daily scrums if needed

**Problem**: "Time calculation failed" or "Invalid start time"

- ✅ Set start time for each date using the time picker
- ✅ Ensure duration_hours is a positive number
- ✅ Check break_hours is 0 or greater (or null)
- ✅ Verify all non-SCRUM entries for the date have proper durations

### Python Script Issues

**Problem**: "UV not found" or "Command not found"

- ✅ Install UV: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- ✅ Restart your terminal after installation
- ✅ Check PATH includes UV binary location
- ✅ Use Python directly if UV unavailable: `pip install requests && python script.py`

**Problem**: "Config file not found"

- ✅ Copy template: `cp script/config.template.py script/config.py`
- ✅ Edit `script/config.py` with your credentials
- ✅ Ensure file is in the correct `script/` directory
- ✅ Check file permissions are readable

**Problem**: "Module import errors"

- ✅ Run `uv sync` from the script directory
- ✅ Ensure Python 3.11+ is installed
- ✅ Check virtual environment is activated
- ✅ Install dependencies manually: `uv add requests`

### Data Validation Issues

**Problem**: "Invalid date format"

- ✅ Use format: `month-day-year` (e.g., `oct-9-2025`, `nov-15-2025`)
- ✅ Valid months: jan, feb, mar, apr, may, jun, jul, aug, sep/sept, oct, nov, dec
- ✅ Use full 4-digit year
- ✅ Month names can be abbreviated or full (case-insensitive)

**Problem**: "Missing required field"

- ✅ Ensure all required fields are present: `project`, `subject`, `duration_hours`, `activity`, `is_scrum`
- ✅ Check for typos in field names (case-sensitive)
- ✅ Verify values are not null where required
- ✅ Use the provided `sample.json` as a template

**Problem**: "Work package creation failed"

- ✅ Check your user has permission to create work packages in the project
- ✅ Verify project exists and is accessible
- ✅ Ensure activity type is valid for the project
- ✅ Check work package subject is not empty or too long

### API Permission Issues

**Problem**: "Permission denied" errors

- ✅ Verify your OpenProject user role has required permissions:
  - View work packages
  - Create work packages
  - Create time entries
  - View projects and users
- ✅ Check project-specific permissions
- ✅ Contact OpenProject administrator if permissions are restricted

**Problem**: "Rate limiting" or "Too many requests"

- ✅ Process smaller batches of work logs
- ✅ Add delays between processing operations
- ✅ Check OpenProject server configuration for rate limits
- ✅ Contact administrator about API limits

### Getting Additional Help

1. **Check API connectivity**: Run `uv run python script/test_api.py` for diagnostics
2. **Review browser console**: Check for JavaScript errors in Chrome DevTools
3. **Validate JSON structure**: Use online JSON validators for your work log files
4. **Test with sample data**: Try processing the included `sample.json` first
5. **Check OpenProject logs**: Administrator can check server logs for API errors

## 📊 Sample Files & Examples

### Included Sample Files

**`sample.json`** - Comprehensive multi-day work log example demonstrating:

- **Multi-day entries**: Oct 23 and Oct 27, 2025
- **IDCOL project**: Real-world development tasks
- **Activity variety**: Development, Support, Meeting activities
- **Break handling**: Different break durations (0.25h, 0.5h, null)
- **Work package references**: Mix of existing work packages and new entries
- **Real scenarios**: HR notifications, portal sync, KPI meetings, operations support

### JSON Structure Example

```json
{
    "logs": [
        {
            "date": "oct-23-2025",
            "entries": [
                {
                    "project": "IDCOL",
                    "subject": "HR approval notification system",
                    "break_hours": null,
                    "duration_hours": 3,
                    "activity": "Development",
                    "is_scrum": false,
                    "work_package_id": 9301
                },
                {
                    "project": "IDCOL",
                    "subject": "Candidate portal field synchronization",
                    "break_hours": 0.5,
                    "duration_hours": 4,
                    "activity": "Development",
                    "is_scrum": false,
                    "work_package_id": null
                }
            ]
        }
    ]
}
```

### Creating Your Own Work Logs

1. **Start with the template** above or copy `sample.json`
2. **Update dates** using the format `month-day-year` (e.g., `nov-15-2025`)
3. **Use exact project names** from the configured PROJECT_MAPPINGS
4. **Include required fields**: project, subject, duration_hours, activity, is_scrum
5. **Set work_package_id** if linking to existing work packages, or `null` for new ones
6. **Add break_hours** for timing calculations between tasks

## 🚀 Advanced Features & Tips

### Intelligent Time Management

- **Automatic Time Chains**: Tasks are automatically chained based on duration and breaks
- **Smart Break Handling**: Variable break times between tasks (15 min, 30 min, 1 hour, etc.)
- **Multi-Day Processing**: Handle work logs spanning multiple dates in a single file
- **SCRUM Time Slots**: Special handling for daily scrum meetings with fixed timing

### Work Package Intelligence

- **Duplicate Detection**: Scans existing work packages to prevent duplicates
- **Smart Linking**: Automatically links to existing work packages with matching subjects
- **Subject Matching**: Case-insensitive partial matching for work package subjects
- **Batch Creation**: Efficiently creates multiple work packages and time entries

### Error Handling & Recovery

- **Graceful Degradation**: Continues processing even if some entries fail
- **Detailed Error Reports**: Specific error messages for each failed entry
- **Partial Success**: Shows results for both successful and failed operations
- **Recovery Options**: Allows retrying failed entries or uploading corrected files

### Performance Optimizations

- **Batch API Calls**: Groups related API operations for efficiency
- **Caching**: Caches project and status data to reduce API calls
- **Progressive Processing**: Shows real-time progress for large work logs
- **Validation First**: Validates all entries before making any API calls

## 📈 Use Cases & Scenarios

### Daily Time Logging

Perfect for logging daily work activities with precise timing:

- Development tasks with accurate start/end times
- Support activities with break calculations
- Meeting participation with SCRUM handling
- Multi-project work with proper categorization

### Weekly Batch Processing

Ideal for processing accumulated work logs:

- Multiple days in a single JSON file
- Consistent project and activity categorization
- Automated work package creation and linking
- Comprehensive timeline visualization

### Team Standardization

Helps teams maintain consistent logging practices:

- Standardized JSON format across team members
- Common project and activity mappings
- Consistent work package creation patterns
- Shared configuration templates

## 🔧 Additional Features

### Smart Time Entry Comments

Time entries include enhanced comments with:

- Start and end times in 12-hour format
- Example: `[11:00 AM - 1:30 PM] Worked on feature implementation`
- Helps with time tracking and reporting

### Batch Processing with Progress

- Real-time progress bar
- Individual entry status updates
- Detailed success/error messages
- Count of created vs updated entries

### Status Management

- Fetch available statuses from OpenProject
- Set custom status for new work packages
- Default status: New (ID: 7)
- Status dropdown with all available options

### Duplicate Prevention

The extension performs comprehensive duplicate checking at multiple levels:

#### 🆕 **Server-Side Validation (Enhanced)**

- **Real-time API Validation**: Checks against OpenProject server during file upload
- **Exact Subject Matching**: Prevents creation of work packages with identical subjects
- **Cross-Project Validation**: Validates subjects within the same project scope
- **Strict Mode (Default)**: Throws validation error and stops processing
- **Non-Strict Mode**: Warns but allows processing to continue
- **Example**: If "Enhance KPI Management, Approval, and Import Processes..." already exists, validation will fail

#### **Client-Side Analysis**

- **Local Duplicate Detection**: Searches for existing work packages with matching subjects
- **Case-insensitive Comparison**: Handles variations in capitalization
- **Partial Matching Detection**: Identifies similar subjects for review
- **User Choice Options**: Allows linking to duplicates or creating new work packages

#### **Configuration Options**

```javascript
// Strict validation (default)
await parser.parseWorkLogFile(file, {
    validateAgainstServer: true,
    throwOnServerDuplicates: true
});

// Non-strict validation (warnings only)
await parser.parseWorkLogFile(file, {
    validateAgainstServer: true,
    throwOnServerDuplicates: false
});

// Disabled server validation
await parser.parseWorkLogFile(file, {
    validateAgainstServer: false
});
```

## 🛠️ Technical Details

### Architecture

- **Manifest V3**: Latest Chrome extension format with service worker
- **ES6 Modules**: Modern JavaScript structure with import/export
- **Service Worker**: Background script for extension lifecycle management
- **Chrome Storage API**: Local storage for configuration persistence
- **Python UV**: Modern Python dependency management
- **OpenProject API v3**: Full compatibility with latest OpenProject API

### File Structure

```plaintext
openproject-chrome-extension/
├── manifest.json           # Extension configuration (v3)
├── README.md              # Comprehensive documentation
├── sample.json            # Example multi-date work log
├── .gitignore            # Git ignore patterns
├── icons/                 # Extension icons (SVG + PNG)
│   ├── icon.svg           # Vector source icon
│   ├── icon16.png         # Toolbar icon
│   ├── icon32.png         # Extension page icon
│   ├── icon48.png         # Extension management icon
│   └── icon128.png        # Web store icon
├── background/
│   └── service-worker.js  # Extension background script (Manifest V3)
├── options/               # Extension user interface
│   ├── options.html       # Stepper workflow interface
│   ├── options.css        # Modern responsive styling
│   └── options.js         # UI logic, event handling, progress tracking
├── shared/                # Core functionality modules
│   ├── config.js          # Configuration & project mappings
│   ├── apiClient.js       # OpenProject API client with error handling
│   ├── parser.js          # JSON parsing, validation, date handling
│   └── workLogService.js  # Work log processing, time calculations
└── script/                # Python implementation
    ├── config.py          # API credentials (created from template)
    ├── config.template.py # Safe configuration template
    ├── main.py            # Python CLI script
    ├── test_api.py        # API connectivity & permission testing
    ├── pyproject.toml     # UV project configuration
    ├── UV_COMMANDS.md     # UV usage reference guide
    ├── uv.lock           # Dependency lock file
    ├── .python-version   # Python version specification
    └── .venv/            # Virtual environment (auto-created)
```

### Key Components

**Chrome Extension Architecture:**

- **Service Worker** (`background/service-worker.js`): Handles extension lifecycle
- **Options Page** (`options/`): Multi-step UI with stepper workflow
- **Shared Modules** (`shared/`): Core functionality used by the extension

**Python Script Architecture:**

- **Main Script** (`script/main.py`): Command-line interface
- **Test Script** (`script/test_api.py`): API validation and diagnostics
- **Configuration** (`script/config.py`): API credentials and mappings

**Core Modules:**

**OpenProjectTimeLogger** (`shared/apiClient.js`)

- API authentication and request handling
- Work package creation, search, and linking
- Time entry creation with detailed comments
- Project, status, and user data fetching
- Comprehensive error handling and retry logic

**WorkLogParser** (`shared/parser.js`)

- JSON file parsing and structure validation
- Date string parsing with multiple format support
- Entry validation with detailed error reporting
- Activity keyword detection and mapping
- Multi-date work log processing

**WorkLogService** (`shared/workLogService.js`)

- Time chain calculations and break handling
- Start time management with user prompts
- Entry processing pipeline and status tracking
- Work package duplicate detection and analysis
- Timeline generation and data visualization

### Technology Stack

**Frontend (Chrome Extension):**

- HTML5 with semantic markup and accessibility
- CSS3 with modern responsive design and animations
- Vanilla JavaScript (ES6+) with modules
- Chrome Extension APIs (storage, permissions, host_permissions)

**Backend Integration:**

- OpenProject REST API v3
- JSON data format for work logs
- HTTP/HTTPS with proper error handling

**Python Implementation:**

- Python 3.11+ with type hints
- UV for dependency management
- Requests library for HTTP operations
- JSON processing and data validation

### Development Features

**Chrome Extension:**

- Real-time validation and user feedback
- Progressive enhancement with stepper workflow
- Responsive design for different screen sizes
- Accessibility features (ARIA labels, keyboard navigation)
- Error boundaries and graceful degradation

**Python Script:**

- Interactive CLI with user prompts
- Comprehensive API testing and diagnostics
- Configuration template system
- Detailed logging and error reporting
- UV-based dependency management

## 🔗 Related Resources

- [OpenProject API Documentation](https://www.openproject.org/docs/api/)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
