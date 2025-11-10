import { loadConfig } from './config.js';
import { OpenProjectTimeLogger } from './apiClient.js';

export class WorkLogParser {
    constructor(filePath = null) {
        this.filePath = filePath;
        this.projectMappings = null;
        this.apiClient = null;
        this.activityKeywords = {
            scrum: 'Meeting',
            meeting: 'Meeting',
            session: 'Meeting',
            clarification: 'Meeting',
            setup: 'Development',
            enhanced: 'Development',
            fixed: 'Development',
            fix: 'Development',
            route: 'Development',
            linkup: 'Development',
            template: 'Development',
            codes: 'Development',
            staging: 'Support',
            server: 'Support',
            feedback: 'Specification',
            recruitment: 'Specification',
            profile: 'Development',
            view: 'Development'
        };
    }

    async parseWorkLogFile(file, options = {}) {
        if (!file.name.toLowerCase().endsWith('.json')) {
            throw new Error('Only JSON files are supported');
        }

        const text = await file.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid JSON file');
        }

        return this.parseJsonWorkLogContent(data, options);
    }

    async initializeApiClient() {
        if (this.apiClient) {
            return this.apiClient;
        }

        this.apiClient = new OpenProjectTimeLogger();
        await this.apiClient.initialize();
        return this.apiClient;
    }

    async validateAgainstServerDuplicates(entries) {
        if (!entries || entries.length === 0) {
            return [];
        }

        const duplicateErrors = [];

        try {
            await this.initializeApiClient();
            const entriesByProject = this.groupEntriesByProject(entries);
            const duplicates = await this.checkProjectDuplicates(entriesByProject);
            duplicateErrors.push(...duplicates);
        } catch (error) {
            console.warn('Could not initialize API client for duplicate checking:', error.message);
            return [];
        }

        return duplicateErrors;
    }

    groupEntriesByProject(entries) {
        const entriesByProject = {};

        entries.forEach((entry, index) => {
            if (this.shouldCheckForDuplicates(entry)) {
                const projectId = entry.project_id;
                if (projectId) {
                    if (!entriesByProject[projectId]) {
                        entriesByProject[projectId] = [];
                    }
                    entriesByProject[projectId].push({ entry, originalIndex: index });
                }
            }
        });

        return entriesByProject;
    }

    shouldCheckForDuplicates(entry) {
        return !entry.work_package_id && !entry.is_scrum;
    }

    async checkProjectDuplicates(entriesByProject) {
        const duplicateErrors = [];
        const totalProjects = Object.keys(entriesByProject).length;
        let processedProjects = 0;

        console.log(`Checking ${totalProjects} project(s) for duplicate work packages...`);

        for (const [projectId, projectEntries] of Object.entries(entriesByProject)) {
            processedProjects++;
            console.log(`Checking project ${processedProjects}/${totalProjects} (ID: ${projectId})...`);

            for (const { entry, originalIndex } of projectEntries) {
                const duplicate = await this.checkEntryDuplicate(entry, projectId, originalIndex);
                if (duplicate) {
                    duplicateErrors.push(duplicate);
                }
            }
        }

        return duplicateErrors;
    }

    async checkEntryDuplicate(entry, projectId, originalIndex) {
        try {
            const existingWp = await this.apiClient.checkExistingWorkPackageBySubject(projectId, entry.subject);

            if (!existingWp) {
                return null;
            }

            return {
                entryIndex: originalIndex,
                subject: entry.subject,
                project: entry.project,
                projectId: projectId,
                existingWorkPackageId: existingWp.id,
                existingSubject: existingWp.subject,
                message: `Work package with subject "${entry.subject}" already exists in project "${entry.project}" (ID: ${existingWp.id}). Use that work package ID or modify the subject.`
            };
        } catch (error) {
            console.warn(`Could not check for duplicates in project ${projectId}:`, error.message);
            return null;
        }
    }

    async parseJsonWorkLogContent(data, options = {}) {
        const config = await loadConfig();
        this.projectMappings = config.PROJECT_MAPPINGS;

        const { validateAgainstServer = true, throwOnServerDuplicates = true } = options;

        if (!this.hasValidLogsArray(data)) {
            throw new Error("Invalid JSON format: Missing 'logs' array");
        }

        if (data.logs.length === 0) {
            throw new Error("No log entries found in 'logs' array");
        }

        const { allTimeEntries, allEntries } = await this.processLogEntries(data.logs);

        if (validateAgainstServer && allEntries.length > 0) {
            await this.addServerDuplicateValidation(allTimeEntries, allEntries);
        }

        return allTimeEntries;
    }

    hasValidLogsArray(data) {
        return data.logs && Array.isArray(data.logs);
    }

    async processLogEntries(logs) {
        const allTimeEntries = {};
        const allEntries = [];

        for (let logIndex = 0; logIndex < logs.length; logIndex++) {
            const logEntry = logs[logIndex];

            if (!logEntry.date) {
                console.warn(`Log entry ${logIndex + 1} missing 'date' field, skipping`);
                continue;
            }

            const result = await this.processLogEntry(logEntry, logIndex);
            if (result) {
                const { parsedDate, timeEntries } = result;
                if (timeEntries.length > 0) {
                    allTimeEntries[parsedDate] = timeEntries;
                    allEntries.push(...timeEntries);
                }
            }
        }

        return { allTimeEntries, allEntries };
    }

    async processLogEntry(logEntry, logIndex) {
        const dateStr = logEntry.date;
        let parsedDate;

        try {
            parsedDate = this.parseDateString(dateStr);
        } catch (e) {
            console.warn(`Log entry ${logIndex + 1} has invalid date format '${dateStr}': ${e.message}`);
            return null;
        }

        const entries = logEntry.entries || [];
        if (!Array.isArray(entries)) {
            console.warn(`Log entry ${logIndex + 1} 'entries' must be an array, skipping`);
            return null;
        }

        const timeEntries = await this.processDateEntries(entries, dateStr, parsedDate);
        return { parsedDate, timeEntries };
    }

    async processDateEntries(entries, dateStr, parsedDate) {
        const timeEntries = [];
        let currentTime = new Date();
        currentTime.setHours(9, 0, 0, 0);

        for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
            const entryData = entries[entryIndex];
            const validationErrors = this.validateEntryData(entryData, entryIndex + 1);

            if (validationErrors.length > 0) {
                this.logValidationErrors(dateStr, entryIndex + 1, validationErrors);
                continue;
            }

            const entry = await this.parseJsonTaskEntry(entryData, currentTime, parsedDate);
            if (entry) {
                timeEntries.push(entry);
                currentTime = new Date(entry.end_time);
            }
        }

        return timeEntries;
    }

    logValidationErrors(dateStr, entryIndex, validationErrors) {
        console.error(`Validation errors for log date ${dateStr}, entry ${entryIndex}:`);
        validationErrors.forEach(error => console.error(`  - ${error}`));
        console.error('Skipping this entry due to validation errors.');
    }

    async addServerDuplicateValidation(allTimeEntries, allEntries) {
        console.log('Checking for duplicate subjects against OpenProject server...');
        const duplicateErrors = await this.validateAgainstServerDuplicates(allEntries);

        if (duplicateErrors.length > 0) {
            allTimeEntries._serverDuplicates = duplicateErrors;
        }
    }

    parseDateString(dateStr) {
        const monthNames = this.getMonthNames();
        const pattern = /^(\w+)-(\d{1,2})-(\d{4})$/;
        const match = dateStr.toLowerCase().match(pattern);

        if (!match) {
            throw new Error(`Date must be in format 'month-day-year' (e.g., 'sept-07-2025'), got '${dateStr}'`);
        }

        const [, monthStr, day, year] = match;
        const month = monthNames[monthStr.toLowerCase()];

        if (!month) {
            const availableMonths = [...new Set(Object.keys(monthNames))].sort();
            throw new Error(`Invalid month '${monthStr}'. Available: ${availableMonths.join(', ')}`);
        }

        return this.buildDateString(year, month, day, monthStr);
    }

    getMonthNames() {
        return {
            jan: 1,
            january: 1,
            feb: 2,
            february: 2,
            mar: 3,
            march: 3,
            apr: 4,
            april: 4,
            may: 5,
            jun: 6,
            june: 6,
            jul: 7,
            july: 7,
            aug: 8,
            august: 8,
            sep: 9,
            sept: 9,
            september: 9,
            oct: 10,
            october: 10,
            nov: 11,
            november: 11,
            dec: 12,
            december: 12
        };
    }

    buildDateString(year, month, day, monthStr) {
        try {
            const yearNum = parseInt(year);
            const monthNum = parseInt(month);
            const dayNum = parseInt(day);

            this.validateDateComponents(yearNum, monthNum, dayNum, year, month, day);
            this.validateActualDate(yearNum, monthNum, dayNum, monthStr, day, year);

            const monthPadded = monthNum.toString().padStart(2, '0');
            const dayPadded = dayNum.toString().padStart(2, '0');

            return `${yearNum}-${monthPadded}-${dayPadded}`;
        } catch (e) {
            throw new Error(`Invalid date values: ${e.message}`);
        }
    }

    validateDateComponents(yearNum, monthNum, dayNum, year, month, day) {
        if (yearNum < 1900 || yearNum > 3000) {
            throw new Error(`Invalid year: ${year}`);
        }
        if (monthNum < 1 || monthNum > 12) {
            throw new Error(`Invalid month: ${month}`);
        }
        if (dayNum < 1 || dayNum > 31) {
            throw new Error(`Invalid day: ${day}`);
        }
    }

    validateActualDate(yearNum, monthNum, dayNum, monthStr, day, year) {
        const testDate = new Date(yearNum, monthNum - 1, dayNum);
        const isValidDate = testDate.getFullYear() === yearNum && testDate.getMonth() === monthNum - 1 && testDate.getDate() === dayNum;

        if (!isValidDate) {
            throw new Error(`Invalid date: ${monthStr}-${day}-${year}`);
        }
    }

    validateEntryData(entryData, entryIndex = null) {
        const errors = [];
        const prefix = entryIndex ? `Entry ${entryIndex}: ` : 'Entry: ';

        this.validateRequiredFields(entryData, prefix, errors);
        this.validateProjectMapping(entryData, prefix, errors);
        this.validateFieldTypes(entryData, prefix, errors);

        return errors;
    }

    validateRequiredFields(entryData, prefix, errors) {
        const requiredFields = ['project', 'subject', 'duration_hours', 'activity', 'is_scrum'];

        for (const field of requiredFields) {
            if (!(field in entryData)) {
                errors.push(`${prefix}Missing required field '${field}'`);
            } else if (entryData[field] === null || entryData[field] === undefined) {
                errors.push(`${prefix}Field '${field}' cannot be null`);
            }
        }
    }

    validateProjectMapping(entryData, prefix, errors) {
        if (!entryData.project || !this.projectMappings) {
            return;
        }

        if (!(entryData.project in this.projectMappings)) {
            const allowedProjects = Object.keys(this.projectMappings);
            errors.push(`${prefix}Invalid project '${entryData.project}'. Allowed values: ${allowedProjects.join(', ')}`);
        }
    }

    validateFieldTypes(entryData, prefix, errors) {
        if (entryData.subject !== undefined) {
            if (typeof entryData.subject !== 'string' || !entryData.subject.trim()) {
                errors.push(`${prefix}Field 'subject' must be a non-empty string`);
            }
        }

        if (entryData.duration_hours !== undefined) {
            const duration = parseFloat(entryData.duration_hours);
            if (isNaN(duration) || duration <= 0) {
                errors.push(`${prefix}Field 'duration_hours' must be a number greater than 0`);
            }
        }

        if (entryData.is_scrum !== undefined) {
            if (typeof entryData.is_scrum !== 'boolean') {
                errors.push(`${prefix}Field 'is_scrum' must be a boolean (true or false)`);
            }
        }

        if (entryData.break_hours !== undefined && entryData.break_hours !== null) {
            const breakHours = parseFloat(entryData.break_hours);
            if (isNaN(breakHours) || breakHours < 0) {
                errors.push(`${prefix}Field 'break_hours' must be a number 0 or greater, or null`);
            }
        }

        if (entryData.work_package_id !== undefined && entryData.work_package_id !== null) {
            const wpId = parseInt(entryData.work_package_id);
            if (isNaN(wpId) || wpId <= 0) {
                errors.push(`${prefix}Field 'work_package_id' must be a positive integer or null`);
            }
        }
    }

    async parseJsonTaskEntry(entryData, startTime, entryDate) {
        const { project, subject, description, activity, work_package_id, is_scrum } = entryData;
        const taskSubject = subject || description;

        if (!project || !taskSubject) {
            return null;
        }

        const durationHours = this.parseDurationHours(entryData.duration_hours);
        if (durationHours === 0) {
            return null;
        }

        const isScrum = !!is_scrum;
        const breakHours = entryData.break_hours || 0;
        const breakMinutes = breakHours ? Math.round(breakHours * 60) : 0;

        const actualStartTime = this.calculateStartTime(isScrum, startTime, breakMinutes);

        if (isScrum && !work_package_id) {
            return null;
        }

        const endTime = new Date(actualStartTime.getTime() + durationHours * 60 * 60 * 1000);
        const taskActivity = activity || this.determineActivity(taskSubject);

        return {
            project,
            work_package_id: work_package_id,
            project_id: this.projectMappings ? this.projectMappings[project] : null,
            subject: taskSubject,
            activity: taskActivity,
            start_time: actualStartTime.toISOString(),
            end_time: endTime.toISOString(),
            hours: durationHours,
            break_minutes: breakMinutes,
            break_hours: breakHours,
            is_scrum: isScrum,
            entry_date: entryDate
        };
    }

    parseDurationHours(durationHours) {
        if (!durationHours) {
            return 0;
        }

        if (typeof durationHours === 'string') {
            return parseFloat(durationHours.replace('h', '')) || 0;
        }

        return parseFloat(durationHours) || 0;
    }

    calculateStartTime(isScrum, startTime, breakMinutes) {
        if (isScrum) {
            const scrumStartTime = new Date(startTime);
            scrumStartTime.setHours(10, 0, 0, 0);
            return scrumStartTime;
        }

        return new Date(startTime.getTime() + breakMinutes * 60 * 1000);
    }

    determineActivity(taskDescription) {
        const taskLower = taskDescription.toLowerCase();
        for (const [keyword, activity] of Object.entries(this.activityKeywords)) {
            if (taskLower.includes(keyword)) {
                return activity;
            }
        }
        return 'Development';
    }

    getDateFromFilename(filePath) {
        if (!filePath) return null;
        const filename = filePath.split('/').pop().split('\\').pop();
        const datePatterns = [/(\w+)-(\d{1,2})-(\d{4})/, /(\d{4})-(\d{1,2})-(\d{1,2})/, /(\d{1,2})-(\d{1,2})-(\d{4})/];
        const monthNames = {
            jan: 1,
            january: 1,
            feb: 2,
            february: 2,
            mar: 3,
            march: 3,
            apr: 4,
            april: 4,
            may: 5,
            jun: 6,
            june: 6,
            jul: 7,
            july: 7,
            aug: 8,
            august: 8,
            sep: 9,
            sept: 9,
            september: 9,
            oct: 10,
            october: 10,
            nov: 11,
            november: 11,
            dec: 12,
            december: 12
        };
        for (const pattern of datePatterns) {
            const match = filename.match(pattern);
            if (match) {
                if (pattern === datePatterns[0]) {
                    const month = monthNames[match[1].toLowerCase()];
                    if (month) {
                        const day = match[2].padStart(2, '0');
                        const monthFormatted = month.toString().padStart(2, '0');
                        return `${match[3]}-${monthFormatted}-${day}`;
                    }
                }
            }
        }
        return null;
    }
}
