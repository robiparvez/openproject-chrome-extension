import { loadConfig } from './config.js';
import { OpenProjectTimeLogger } from './apiClient.js';
import { WorkLogParser } from './parser.js';

export class WorkLogService {
    constructor() {
        this.config = null;
        this.logger = new OpenProjectTimeLogger();
        this.parser = new WorkLogParser();
        this.workLogEntries = [];
        this.analysisData = null;
        this.statusData = [];
    }

    async initialize() {
        this.config = await loadConfig();
        await this.logger.initialize();
    }

    async initializeLogger() {
        if (!this.logger) {
            this.logger = new OpenProjectTimeLogger();
        }
        await this.logger.initialize();
    }

    async fetchStatuses() {
        if (this.statusData.length === 0) {
            await this.initializeLogger();
            this.statusData = await this.logger.getStatuses();
        }
        return this.statusData;
    }

    async processFile(file) {
        if (!file.name.toLowerCase().endsWith('.json')) {
            throw new Error('The uploaded file must be a JSON file');
        }

        const allDateEntries = await this.parser.parseWorkLogFile(file);

        if (Object.keys(allDateEntries).length === 0) {
            throw new Error('No valid entries found in the file');
        }

        const serverDuplicates = this.extractServerDuplicates(allDateEntries);
        this.workLogEntries = this.extractWorkLogEntries(allDateEntries);

        return {
            entries: this.workLogEntries,
            dateCount: Object.keys(allDateEntries).length,
            totalEntries: this.workLogEntries.length,
            serverDuplicates: serverDuplicates
        };
    }

    extractServerDuplicates(allDateEntries) {
        const serverDuplicates = allDateEntries._serverDuplicates || [];
        delete allDateEntries._serverDuplicates;
        return serverDuplicates;
    }

    extractWorkLogEntries(allDateEntries) {
        const entries = [];
        for (const [date, dateEntries] of Object.entries(allDateEntries)) {
            entries.push(...dateEntries);
        }
        return entries;
    }

    async performWorkPackageAnalysis() {
        if (!this.config) {
            await this.initialize();
        }

        const analysisResult = {
            scrum: [],
            existing: [],
            new: [],
            existingWorkPackages: [],
            duplicates: []
        };

        const uniqueEntries = this.getUniqueEntries();

        for (const entry of uniqueEntries) {
            await this.categorizeEntry(entry, analysisResult);
        }

        this.logAnalysisSummary(analysisResult);
        this.analysisData = analysisResult;

        return analysisResult;
    }

    getUniqueEntries() {
        const seenEntries = new Set();
        const uniqueEntries = [];

        for (const entry of this.workLogEntries) {
            const entryKey = `${entry.project}|${entry.subject}|${entry.hours || entry.duration_hours}`;
            if (!seenEntries.has(entryKey)) {
                seenEntries.add(entryKey);
                uniqueEntries.push(entry);
            }
        }

        return uniqueEntries;
    }

    async categorizeEntry(entry, analysisResult) {
        if (entry.is_scrum && entry.work_package_id) {
            console.log(`✅ Entry "${entry.subject}" categorized as SCRUM (has work_package_id: ${entry.work_package_id})`);
            analysisResult.scrum.push(entry);
            return;
        }

        if (entry.work_package_id) {
            console.log(`✅ Entry "${entry.subject}" categorized as EXISTING (has work_package_id: ${entry.work_package_id})`);
            analysisResult.existing.push(entry);
            return;
        }

        await this.checkForDuplicatesOrNew(entry, analysisResult);
    }

    async checkForDuplicatesOrNew(entry, analysisResult) {
        const projectMapping = this.config.PROJECT_MAPPINGS || {};
        const projectId = projectMapping[entry.project];

        if (!projectId) {
            throw new Error(`Project mapping not found for ${entry.project}`);
        }

        console.log(`🔍 Checking entry "${entry.subject}" in project "${entry.project}" (ID: ${projectId}) for duplicates...`);

        try {
            const existingWp = await this.logger.checkExistingWorkPackageBySubject(projectId, entry.subject);

            if (existingWp) {
                this.handleDuplicateEntry(entry, existingWp, analysisResult);
            } else {
                this.handleNewEntry(entry, analysisResult);
            }
        } catch (error) {
            console.error(`❌ Error checking for duplicates on entry "${entry.subject}":`, error.message);
            console.log(`🆕 Adding to NEW due to error`);
            analysisResult.new.push(entry);
        }
    }

    handleDuplicateEntry(entry, existingWp, analysisResult) {
        console.log(`🔄 DUPLICATE FOUND: Entry "${entry.subject}" matches existing work package ID: ${existingWp.id}`);
        entry.existing_work_package_id = existingWp.id;
        analysisResult.duplicates.push({
            ...entry,
            existing_work_package_id: existingWp.id,
            existing_subject: existingWp.subject
        });
    }

    handleNewEntry(entry, analysisResult) {
        console.log(`🆕 NEW: Entry "${entry.subject}" has no match on server, will create new work package`);
        analysisResult.new.push(entry);
    }

    logAnalysisSummary(analysisResult) {
        console.log('📊 Analysis Summary:');
        console.log(`   SCRUM entries: ${analysisResult.scrum.length}`);
        console.log(`   EXISTING work packages: ${analysisResult.existing.length}`);
        console.log(`   DUPLICATE entries (found on server): ${analysisResult.duplicates.length}`);
        console.log(`   NEW work packages to create: ${analysisResult.new.length}`);

        if (analysisResult.duplicates.length > 0) {
            console.log('🔄 Duplicate entries details:');
            analysisResult.duplicates.forEach((dup, idx) => {
                console.log(`   ${idx + 1}. "${dup.subject}" (Project: ${dup.project}, WP ID: ${dup.existing_work_package_id})`);
            });
        }
    }

    calculateTotalTime() {
        let totalMinutes = 0;
        this.workLogEntries.forEach(entry => {
            totalMinutes += (entry.hours || entry.duration_hours || 0) * 60;
        });
        return (totalMinutes / 60).toFixed(2);
    }

    calculateAllTimes() {
        const validationIssues = [];
        const entriesByDate = this.groupEntriesByDate();

        for (const [date, entries] of Object.entries(entriesByDate)) {
            const sortedEntries = this.sortEntriesForDate(entries);
            this.processDateEntries(sortedEntries, validationIssues);
        }

        return validationIssues;
    }

    groupEntriesByDate() {
        const entriesByDate = {};

        this.workLogEntries.forEach(entry => {
            const date = entry.entry_date;
            if (!entriesByDate[date]) {
                entriesByDate[date] = [];
            }
            entriesByDate[date].push(entry);
        });

        return entriesByDate;
    }

    sortEntriesForDate(entries) {
        return [...entries].sort((a, b) => {
            if (a.is_scrum && !b.is_scrum) return -1;
            if (!a.is_scrum && b.is_scrum) return 1;

            if (a.calculated_start_time && b.calculated_start_time) {
                return this.compareEntryTimes(a.calculated_start_time, b.calculated_start_time);
            }

            if (a.calculated_start_time && !b.calculated_start_time) return -1;
            if (!a.calculated_start_time && b.calculated_start_time) return 1;

            return this.workLogEntries.indexOf(a) - this.workLogEntries.indexOf(b);
        });
    }

    compareEntryTimes(timeA, timeB) {
        const cleanTimeA = this.extractTimeFromString(timeA) || '00:00';
        const cleanTimeB = this.extractTimeFromString(timeB) || '00:00';
        return new Date(`1970-01-01T${cleanTimeA}:00`) - new Date(`1970-01-01T${cleanTimeB}:00`);
    }

    processDateEntries(sortedEntries, validationIssues) {
        let currentTime = null;
        let isFirstNonScrum = true;

        sortedEntries.forEach((entry, index) => {
            if (entry.is_scrum) {
                this.processScrumEntry(entry, validationIssues);
                return;
            }

            currentTime = this.calculateEntryStartTime(entry, sortedEntries, index, isFirstNonScrum);
            if (isFirstNonScrum) {
                isFirstNonScrum = false;
            }

            this.setEntryTimes(entry, currentTime, sortedEntries, index, validationIssues);
            currentTime = entry.calculated_end_time;
        });
    }

    processScrumEntry(entry, validationIssues) {
        if (!entry.work_package_id) {
            validationIssues.push({
                type: 'missing_work_package_id',
                entry: entry,
                message: `SCRUM entry "${entry.subject}" is missing required work_package_id`
            });
        }

        if (!entry.calculated_start_time) {
            entry.calculated_start_time = '10:00';
        }

        entry.calculated_end_time = this.addHoursToTime(entry.calculated_start_time, entry.hours || entry.duration_hours || 0);
    }

    calculateEntryStartTime(entry, sortedEntries, index, isFirstNonScrum) {
        if (isFirstNonScrum) {
            return this.getFirstNonScrumStartTime(entry);
        }

        return this.getSubsequentStartTime(entry, sortedEntries, index);
    }

    getFirstNonScrumStartTime(entry) {
        if (entry.calculated_start_time) {
            return entry.calculated_start_time;
        }

        if (!entry.user_set_start_time) {
            return null;
        }

        return this.extractTimeFromString(entry.start_time) || '09:00';
    }

    getSubsequentStartTime(entry, sortedEntries, index) {
        const breakHours = entry.break_hours || 0;
        const previousEntry = this.findPreviousNonScrumEntry(sortedEntries, index);

        if (!previousEntry) {
            return null;
        }

        return this.addHoursToTime(previousEntry.calculated_end_time, breakHours);
    }

    setEntryTimes(entry, currentTime, sortedEntries, index, validationIssues) {
        entry.calculated_start_time = currentTime;
        entry.calculated_end_time = this.addHoursToTime(currentTime, entry.hours || entry.duration_hours || 0);

        this.validateEntryTimes(entry, currentTime);
        this.checkTimeOverlap(entry, sortedEntries, index, currentTime, validationIssues);
    }

    validateEntryTimes(entry, currentTime) {
        const endTime = entry.calculated_end_time;

        if (!currentTime || currentTime === 'Invalid Time' || !endTime || endTime === 'Invalid Time') {
            console.warn('Time calculation issue:', {
                entry: entry.subject,
                hours: entry.hours || entry.duration_hours,
                calculatedStart: currentTime,
                calculatedEnd: endTime
            });
        }
    }

    checkTimeOverlap(entry, sortedEntries, index, currentTime, validationIssues) {
        const prevEntry = this.findPreviousNonScrumEntry(sortedEntries, index);

        if (!prevEntry || !prevEntry.calculated_end_time) {
            return;
        }

        const prevEndTime = new Date(`1970-01-01T${prevEntry.calculated_end_time}:00`);
        const currentStartTime = new Date(`1970-01-01T${currentTime}:00`);

        if (currentStartTime < prevEndTime) {
            validationIssues.push({
                type: 'time_overlap',
                entry: entry,
                message: `Start time ${currentTime} overlaps with previous task end time ${prevEntry.calculated_end_time}`
            });
        }
    }

    findPreviousNonScrumEntry(entries, currentIndex) {
        for (let i = currentIndex - 1; i >= 0; i--) {
            if (!entries[i].is_scrum) {
                return entries[i];
            }
        }
        return null;
    }

    addHoursToTime(timeString, hours) {
        if (!timeString || !hours) return timeString;

        try {
            let cleanTimeString = timeString;

            if (timeString.includes('T')) {
                const date = new Date(timeString);
                cleanTimeString = date.toTimeString().slice(0, 5); // HH:MM format
            }

            const [hourStr, minuteStr] = cleanTimeString.split(':');
            const startHour = parseInt(hourStr) || 0;
            const startMinute = parseInt(minuteStr || 0) || 0;

            // Convert hours to minutes and round to avoid floating point issues
            const additionalMinutes = Math.round(hours * 60);
            const totalMinutes = startHour * 60 + startMinute + additionalMinutes;

            const newHours = Math.floor(totalMinutes / 60);
            const newMinutes = totalMinutes % 60;

            // Ensure we don't go beyond 24 hours
            const finalHours = newHours % 24;

            return `${String(finalHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        } catch (error) {
            console.error('Error in addHoursToTime:', error, 'timeString:', timeString, 'hours:', hours);
            return timeString;
        }
    }

    extractTimeFromString(timeString) {
        if (!timeString) return null;

        try {
            // If it's an ISO string, extract just the time part
            if (timeString.includes('T')) {
                const date = new Date(timeString);
                return date.toTimeString().slice(0, 5); // HH:MM format
            }

            // If it's already in HH:MM format, return as is
            if (timeString.match(/^\d{1,2}:\d{2}$/)) {
                return timeString;
            }

            return null;
        } catch (error) {
            console.error('Error extracting time from string:', error, 'timeString:', timeString);
            return null;
        }
    }

    formatTime12Hour(time24) {
        if (!time24 || typeof time24 !== 'string') return 'Invalid Time';

        try {
            const timeParts = time24.split(':');
            if (timeParts.length !== 2) return 'Invalid Time';

            const hour = parseInt(timeParts[0]) || 0;
            const minute = parseInt(timeParts[1]) || 0;

            // Validate hour and minute ranges
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                return 'Invalid Time';
            }

            const period = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

            return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
        } catch (error) {
            console.error('Error in formatTime12Hour:', error, 'time24:', time24);
            return 'Invalid Time';
        }
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'Not set';

        try {
            if (dateTimeString.includes('T')) {
                const date = new Date(dateTimeString);
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            } else {
                return this.formatTime12Hour(dateTimeString);
            }
        } catch (e) {
            return dateTimeString;
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    generateSmartComment(subject, activity, durationHours) {
        const subjectLower = subject.toLowerCase();

        const templates = {
            bug: [`Fixed ${subject.toLowerCase()} issue`, `Resolved bug in ${subject.toLowerCase()}`, `Debugged and fixed ${subject.toLowerCase()}`],
            development: [`Developed ${subject.toLowerCase()} functionality`, `Implemented ${subject.toLowerCase()} feature`, `Created ${subject.toLowerCase()} module`],
            testing: [`Tested ${subject.toLowerCase()} functionality`, `Performed quality assurance on ${subject.toLowerCase()}`],
            update: [`Updated ${subject.toLowerCase()}`, `Enhanced ${subject.toLowerCase()} functionality`],
            ui: [`Improved ${subject.toLowerCase()} user interface`, `Enhanced ${subject.toLowerCase()} user experience`],
            api: [`Integrated ${subject.toLowerCase()} API`, `Developed ${subject.toLowerCase()} API endpoint`],
            database: [`Optimized ${subject.toLowerCase()} database queries`, `Updated ${subject.toLowerCase()} database schema`],
            config: [`Configured ${subject.toLowerCase()} settings`, `Set up ${subject.toLowerCase()} environment`],
            documentation: [`Documented ${subject.toLowerCase()} process`, `Created ${subject.toLowerCase()} documentation`],
            research: [`Researched ${subject.toLowerCase()} solution`, `Analyzed ${subject.toLowerCase()} requirements`]
        };

        let selectedTemplates = [];
        for (const [key, templateList] of Object.entries(templates)) {
            if (subjectLower.includes(key) || activity.toLowerCase().includes(key)) {
                selectedTemplates = templateList;
                break;
            }
        }

        if (selectedTemplates.length === 0) {
            selectedTemplates = activity === 'Development' ? templates.development : activity === 'Testing' ? templates.testing : activity === 'Support' ? templates.bug : [`Worked on ${subject.toLowerCase()}`];
        }

        let comment = selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];

        if (durationHours >= 4) {
            comment += '. Comprehensive work completed with thorough testing.';
        } else if (durationHours >= 2) {
            comment += '. Task completed successfully.';
        }

        return comment;
    }

    async processEntry(entry, commentData = {}) {
        const workPackageId = entry.work_package_id || entry.existing_work_package_id;
        const entryDate = entry.entry_date || entry.date;

        if (!entryDate) {
            throw new Error(`Entry missing date information: ${entry.subject}`);
        }

        this.enrichEntryMetadata(entry, commentData);

        if (entry.is_scrum && workPackageId) {
            return await this.processScrumTimeEntry(entry, workPackageId, entryDate);
        }

        if (entry.existing_work_package_id) {
            return await this.processExistingWorkPackage(entry, entryDate);
        }

        if (entry.work_package_id) {
            return await this.processDuplicateWorkPackage(entry, workPackageId, entryDate);
        }

        return await this.processNewWorkPackage(entry, commentData, entryDate);
    }

    enrichEntryMetadata(entry, commentData) {
        const newEntries = this.analysisData.new || [];
        const newEntryIndex = newEntries.findIndex(newEntry => newEntry.project === entry.project && newEntry.subject === entry.subject);

        if (newEntryIndex === -1) {
            return;
        }

        const statusValue = commentData[`status_${newEntryIndex}`];
        const selectedStatusId = statusValue ? parseInt(statusValue) : null;

        if (!selectedStatusId || isNaN(selectedStatusId)) {
            return;
        }

        entry.statusId = selectedStatusId;
        const statusName = this.statusData.find(s => s.id === selectedStatusId)?.name || 'Unknown Status';
        entry.statusName = statusName;
    }

    async processScrumTimeEntry(entry, workPackageId, entryDate) {
        const duration = entry.duration_hours || entry.hours || 0;
        await this.logger.createTimeEntry(workPackageId, entryDate, entry.calculated_start_time || entry.start_time, duration, entry.activity, `[${entry.project}] ${entry.subject}`);

        return {
            type: 'scrum',
            message: `SCRUM: ${entry.project} - ${entry.subject} (${duration}h)`
        };
    }

    async processExistingWorkPackage(entry, entryDate) {
        const duration = entry.duration_hours || entry.hours || 0;
        await this.logger.createTimeEntry(entry.existing_work_package_id, entryDate, entry.calculated_start_time || entry.start_time, duration, entry.activity, `[${entry.project}] ${entry.subject}`);

        return {
            type: 'existing',
            message: `Existing WP: ${entry.project} - ${entry.subject} (${duration}h)`
        };
    }

    async processDuplicateWorkPackage(entry, workPackageId, entryDate) {
        const duration = entry.duration_hours || entry.hours || 0;
        await this.logger.createTimeEntry(workPackageId, entryDate, entry.calculated_start_time || entry.start_time, duration, entry.activity, `[${entry.project}] ${entry.subject}`);

        return {
            type: 'duplicate',
            message: `Added time to duplicate: ${entry.project} - ${entry.subject} (+${duration}h)`
        };
    }

    async processNewWorkPackage(entry, commentData, entryDate) {
        const projectId = this.getProjectId(entry.project);
        const existingWorkPackage = await this.logger.findWorkPackageBySubject(projectId, entry.subject);

        if (existingWorkPackage) {
            return await this.processFoundExistingWorkPackage(entry, existingWorkPackage, entryDate);
        }

        return await this.createNewWorkPackageWithTime(entry, projectId, commentData, entryDate);
    }

    getProjectId(projectName) {
        const projectMapping = this.config.PROJECT_MAPPINGS || {};
        const projectId = projectMapping[`${projectName}_PROJECT`] || projectMapping[projectName];

        if (!projectId) {
            throw new Error(`No project mapping found for project: ${projectName}`);
        }

        return projectId;
    }

    async processFoundExistingWorkPackage(entry, existingWorkPackage, entryDate) {
        const duration = entry.duration_hours || entry.hours || 0;
        await this.logger.createTimeEntry(existingWorkPackage.id, entryDate, entry.calculated_start_time || entry.start_time, duration, entry.activity, `[${entry.project}] ${entry.subject}`);

        return {
            type: 'found_existing',
            message: `Found existing WP: ${entry.project} - ${entry.subject} (${duration}h)`
        };
    }

    async createNewWorkPackageWithTime(entry, projectId, commentData, entryDate) {
        const newEntries = this.analysisData.new || [];
        const newEntryIndex = newEntries.findIndex(newEntry => newEntry.project === entry.project && newEntry.subject === entry.subject);

        const workPackage = await this.logger.createWorkPackage(projectId, entry.subject, entry.activity, commentData[`comment_${newEntryIndex}`] || '', entry.statusId || 7);

        const duration = entry.duration_hours || entry.hours || 0;
        await this.logger.createTimeEntry(workPackage.id, entryDate, entry.calculated_start_time || entry.start_time, duration, entry.activity, `[${entry.project}] ${entry.subject}`);

        const statusText = entry.statusName ? `, Status: ${entry.statusName}` : '';
        return {
            type: 'new',
            message: `New WP created: ${entry.project} - ${entry.subject} (ID: ${workPackage.id}, ${duration}h${statusText})`,
            workPackageId: workPackage.id
        };
    }

    async processAllEntries(commentData = {}, progressCallback = null) {
        if (!this.logger) {
            await this.initialize();
        }

        const results = [];
        const stats = { createdCount: 0, updatedCount: 0, errorCount: 0 };
        const totalEntries = this.workLogEntries.length;

        for (let i = 0; i < this.workLogEntries.length; i++) {
            const entry = this.workLogEntries[i];

            this.notifyProgress(progressCallback, i + 1, totalEntries, entry);
            await this.processAndTrackEntry(entry, commentData, results, stats);
        }

        return this.buildProcessingResult(results, stats, totalEntries);
    }

    notifyProgress(progressCallback, current, total, entry) {
        if (!progressCallback) {
            return;
        }

        progressCallback({
            current,
            total,
            entry,
            message: `Processing: ${entry.project} - ${entry.subject}`
        });
    }

    async processAndTrackEntry(entry, commentData, results, stats) {
        try {
            const result = await this.processEntry(entry, commentData);
            results.push({ success: true, entry, result });

            this.updateStats(result.type, stats);
        } catch (error) {
            results.push({ success: false, entry, error: error.message });
            stats.errorCount++;
        }
    }

    updateStats(resultType, stats) {
        if (resultType === 'new') {
            stats.createdCount++;
        } else {
            stats.updatedCount++;
        }
    }

    buildProcessingResult(results, stats, totalEntries) {
        return {
            results,
            createdCount: stats.createdCount,
            updatedCount: stats.updatedCount,
            successCount: stats.createdCount + stats.updatedCount,
            errorCount: stats.errorCount,
            totalEntries
        };
    }

    checkAndPromptForStartTime() {
        const entriesByDate = {};

        this.workLogEntries.forEach(entry => {
            const date = entry.entry_date;
            if (!date) return;

            if (!entriesByDate[date]) {
                entriesByDate[date] = [];
            }
            entriesByDate[date].push(entry);
        });

        const sortedDates = Object.keys(entriesByDate).sort();

        for (const date of sortedDates) {
            const entries = entriesByDate[date];

            entries.sort((a, b) => {
                const aIndex = this.workLogEntries.indexOf(a);
                const bIndex = this.workLogEntries.indexOf(b);
                return aIndex - bIndex;
            });

            const firstNonScrumEntry = entries.find(entry => !entry.is_scrum);

            if (firstNonScrumEntry && !firstNonScrumEntry.user_set_start_time) {
                entries.forEach(entry => {
                    if (!entry.is_scrum) {
                        delete entry.calculated_start_time;
                        delete entry.calculated_end_time;
                    }
                });

                return { needsStartTime: true, entry: firstNonScrumEntry, date: date };
            }
        }

        return { needsStartTime: false };
    }

    setStartTimeForFirstEntry(startTime, targetDate = null) {
        if (targetDate) {
            const firstNonScrumEntry = this.workLogEntries.find(entry => !entry.is_scrum && entry.entry_date === targetDate);
            if (firstNonScrumEntry) {
                firstNonScrumEntry.calculated_start_time = startTime;
                firstNonScrumEntry.user_set_start_time = true;
                const validationIssues = this.calculateAllTimes();
                return validationIssues;
            }
        } else {
            const firstNonScrumEntry = this.workLogEntries.find(entry => !entry.is_scrum);
            if (firstNonScrumEntry) {
                firstNonScrumEntry.calculated_start_time = startTime;
                firstNonScrumEntry.user_set_start_time = true;
                const validationIssues = this.calculateAllTimes();
                return validationIssues;
            }
        }
        return [];
    }

    getAnalysisData() {
        return this.analysisData;
    }

    getWorkLogEntries() {
        return this.workLogEntries;
    }

    getFirstEntryDate() {
        return this.workLogEntries.length > 0 ? this.formatDate(this.workLogEntries[0].entry_date || this.workLogEntries[0].date) : 'Unknown';
    }
}
