/**
 * Adviser AI - Batch Transcript Processor
 * Handles mass upload of transcripts, auto-client creation, and duplicate detection
 */

const BatchProcessor = {
    queue: [],           // Files waiting to be processed
    results: [],         // Processing results
    isProcessing: false,
    currentIndex: 0,
    duplicateQueue: [],  // Transcripts needing duplicate confirmation

    // Start batch processing of multiple transcript files
    startBatch: async function(files) {
        if (this.isProcessing) {
            App.showAlert('Batch processing already in progress', 'warning');
            return;
        }

        this.queue = Array.from(files);
        this.results = [];
        this.currentIndex = 0;
        this.duplicateQueue = [];
        this.isProcessing = true;

        this.renderBatchPanel();
        await this.processNext();
    },

    // Process the next file in the queue
    processNext: async function() {
        if (this.currentIndex >= this.queue.length) {
            this.isProcessing = false;
            this.renderBatchComplete();
            return;
        }

        const file = this.queue[this.currentIndex];
        this.updateFileStatus(this.currentIndex, 'processing', 'Extracting data...');

        try {
            const text = await App.readFileAsText(file);

            // Step 1: Quick-extract client name from transcript
            const nameInfo = await this.extractClientName(text);

            if (!nameInfo || !nameInfo.firstName || !nameInfo.lastName) {
                this.results.push({
                    fileName: file.name,
                    status: 'error',
                    message: 'Could not identify client name in transcript'
                });
                this.updateFileStatus(this.currentIndex, 'error', 'No client name found');
                this.currentIndex++;
                await this.processNext();
                return;
            }

            // Step 2: Check for existing clients with same/similar name
            const matches = await this.findMatchingClients(nameInfo.firstName, nameInfo.lastName);

            if (matches.length > 0) {
                // Duplicate detected - pause and ask user
                this.updateFileStatus(this.currentIndex, 'duplicate', `Possible match: ${matches[0].name}`);
                this.showDuplicateModal(file, text, nameInfo, matches);
                return; // Wait for user decision
            }

            // Step 3: No duplicate - create new client and process
            await this.processTranscriptForNewClient(file, text, nameInfo);

        } catch (error) {
            console.error('Batch processing error:', error);
            this.results.push({
                fileName: file.name,
                status: 'error',
                message: error.message
            });
            this.updateFileStatus(this.currentIndex, 'error', error.message);
        }

        this.currentIndex++;
        await this.processNext();
    },

    // Extract client name from transcript using Claude API (lightweight call)
    extractClientName: async function(transcriptText) {
        const apiKey = Extraction.getApiKey();
        const provider = Extraction.getProvider();
        const model = Extraction.getModel();

        if (!apiKey) {
            // Demo mode - try to parse name from text
            return this.parseNameFromText(transcriptText);
        }

        try {
            const systemPrompt = 'Extract the PRIMARY CLIENT name (not the adviser) from this meeting transcript. Return ONLY a JSON object: {"firstName": "...", "lastName": "...", "meetingDate": "YYYY-MM-DD or null"}. No explanation.';
            const response = await fetch(Extraction.API_URLS[provider], {
                method: 'POST',
                headers: provider === 'openai' ? {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                } : {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: provider === 'openai'
                    ? JSON.stringify({
                        model: model || 'gpt-4o',
                        input: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: transcriptText.substring(0, 3000) }
                        ],
                        text: { format: { type: 'json_object' } },
                        max_output_tokens: 512
                    })
                    : JSON.stringify({
                        model: model || 'claude-opus-4-20250514',
                        max_tokens: 256,
                        system: systemPrompt,
                        messages: [
                            { role: 'user', content: transcriptText.substring(0, 3000) }
                        ]
                    })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            let jsonStr = provider === 'openai'
                ? (data.output_text || data.output?.[0]?.content?.[0]?.text || '').trim()
                : (data.content?.[0]?.text || '').trim();
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) jsonStr = jsonMatch[1].trim();

            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('Name extraction error:', error);
            return this.parseNameFromText(transcriptText);
        }
    },

    // Fallback: try to parse a name from transcript text heuristically
    parseNameFromText: function(text) {
        // Look for patterns like "Client: FirstName LastName" or "Meeting with FirstName LastName"
        const patterns = [
            /(?:client|participant|attendee)[:\s]+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
            /(?:meeting with|transcript for|interview with)[:\s]+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
            /(?:Mr|Mrs|Ms|Dr|Miss)\.?\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return { firstName: match[1], lastName: match[2], meetingDate: null };
            }
        }

        return null;
    },

    // Find existing clients matching the name
    findMatchingClients: async function(firstName, lastName) {
        const clients = await Database.getAllClients();
        const matches = [];

        const normalize = (str) => (str || '').toLowerCase().trim();
        const targetFirst = normalize(firstName);
        const targetLast = normalize(lastName);

        for (const client of clients) {
            const clientFirst = normalize(client.personal.firstName);
            const clientLast = normalize(client.personal.lastName);

            // Exact match
            if (clientFirst === targetFirst && clientLast === targetLast) {
                matches.push({
                    client: client,
                    name: `${client.personal.firstName} ${client.personal.lastName}`,
                    matchType: 'exact',
                    completeness: client.dataCompleteness || 0
                });
                continue;
            }

            // Last name match with similar first name
            if (clientLast === targetLast && this.isSimilar(clientFirst, targetFirst)) {
                matches.push({
                    client: client,
                    name: `${client.personal.firstName} ${client.personal.lastName}`,
                    matchType: 'similar',
                    completeness: client.dataCompleteness || 0
                });
            }
        }

        return matches;
    },

    // Simple similarity check (Levenshtein-like)
    isSimilar: function(str1, str2) {
        if (str1 === str2) return true;
        if (Math.abs(str1.length - str2.length) > 3) return false;

        // Check if one contains the other
        if (str1.includes(str2) || str2.includes(str1)) return true;

        // Simple character overlap check
        let matches = 0;
        const shorter = str1.length <= str2.length ? str1 : str2;
        const longer = str1.length > str2.length ? str1 : str2;

        for (const char of shorter) {
            if (longer.includes(char)) matches++;
        }

        return (matches / shorter.length) >= 0.7;
    },

    // Process transcript for a new client (auto-create)
    processTranscriptForNewClient: async function(file, text, nameInfo) {
        this.updateFileStatus(this.currentIndex, 'processing', 'Creating new client...');

        // Create new client
        const newClient = ClientSchema.createEmptyClient();
        newClient.personal.firstName = nameInfo.firstName;
        newClient.personal.lastName = nameInfo.lastName;
        await Database.saveClient(newClient);

        // Now run full extraction
        await this.runFullExtraction(file, text, newClient);
    },

    // Process transcript for an existing client (merge data)
    processTranscriptForExistingClient: async function(file, text, existingClient) {
        this.updateFileStatus(this.currentIndex, 'processing', `Updating ${existingClient.personal.firstName}...`);
        await this.runFullExtraction(file, text, existingClient);
    },

    // Run full extraction and auto-approve high-confidence fields
    runFullExtraction: async function(file, text, client) {
        this.updateFileStatus(this.currentIndex, 'processing', 'AI extracting data...');

        // Save transcript record
        const transcript = {
            clientId: client.id,
            fileName: file.name,
            content: text,
            uploadedAt: new Date().toISOString()
        };
        await Database.saveTranscript(transcript);

        // Extract data
        const extraction = await Extraction.extractFromTranscript(text, client);

        if (!extraction.success) {
            this.results.push({
                fileName: file.name,
                clientName: `${client.personal.firstName} ${client.personal.lastName}`,
                clientId: client.id,
                status: 'error',
                message: extraction.error || 'Extraction failed'
            });
            this.updateFileStatus(this.currentIndex, 'error', 'Extraction failed');
            return;
        }

        // Auto-approve all fields with confidence >= 0.6
        let updatedClient = JSON.parse(JSON.stringify(client));
        let fieldsUpdated = 0;
        const fieldsApplied = [];

        const applyFields = (data, prefix = '') => {
            for (const key in data) {
                const value = data[key];
                const path = prefix ? `${prefix}.${key}` : key;

                if (Array.isArray(value)) {
                    // Handle arrays (children, pensions, properties, etc.)
                    if (value.length > 0) {
                        const existingArray = App.getNestedValueSafe(updatedClient, path) || [];
                        value.forEach((item, index) => {
                            if (typeof item === 'object') {
                                // Create new array entry if needed
                                if (index >= existingArray.length) {
                                    const creator = this.getArrayItemCreator(key);
                                    if (creator) {
                                        existingArray.push(creator());
                                    }
                                }
                                // Apply fields to array item
                                applyFields(item, `${path}[${index}]`);
                            }
                        });
                        // Only set if we actually have items
                        if (existingArray.length > 0) {
                            App.setNestedValue(updatedClient, path, existingArray);
                        }
                    }
                } else if (value && typeof value === 'object') {
                    if ('value' in value && 'confidence' in value) {
                        if (value.value !== null && value.confidence >= 0.6) {
                            App.setNestedValue(updatedClient, path, value.value);
                            fieldsUpdated++;
                            fieldsApplied.push(path);
                        }
                    } else {
                        applyFields(value, path);
                    }
                }
            }
        };

        applyFields(extraction.data);

        // Update metadata
        updatedClient.version = (updatedClient.version || 0) + 1;
        updatedClient.updatedAt = new Date().toISOString();
        updatedClient.dataSources = updatedClient.dataSources || [];
        updatedClient.dataSources.push({
            type: 'batch_transcript',
            fileName: file.name,
            date: new Date().toISOString(),
            fieldsUpdated: fieldsUpdated
        });
        updatedClient.dataCompleteness = ClientSchema.calculateCompleteness(updatedClient);

        await Database.saveClient(updatedClient);

        // Track result
        this.results.push({
            fileName: file.name,
            clientName: `${updatedClient.personal.firstName} ${updatedClient.personal.lastName}`,
            clientId: updatedClient.id,
            status: 'success',
            fieldsUpdated: fieldsUpdated,
            completeness: updatedClient.dataCompleteness,
            summary: extraction.summary,
            missingFields: extraction.missingFields || []
        });

        this.updateFileStatus(this.currentIndex, 'success', `${fieldsUpdated} fields updated`);
    },

    // Get the creator function for array items
    getArrayItemCreator: function(key) {
        const creators = {
            children: () => ClientSchema.createEmptyChild(),
            pensions: () => ClientSchema.createEmptyPension(),
            properties: () => ClientSchema.createEmptyProperty(),
            investments: () => ClientSchema.createEmptyInvestment(),
            bankAccounts: () => ClientSchema.createEmptyBankAccount(),
            debts: () => ClientSchema.createEmptyDebt(),
            protection: () => ClientSchema.createEmptyProtection()
        };
        return creators[key] || null;
    },

    // Show duplicate detection modal
    showDuplicateModal: function(file, text, nameInfo, matches) {
        const modal = document.getElementById('duplicateModal');
        const body = document.getElementById('duplicateModalBody');

        const matchListHtml = matches.map((m, i) => `
            <div class="duplicate-option" data-index="${i}">
                <div class="duplicate-option-header">
                    <strong>${App.escapeHtml(m.name)}</strong>
                    <span class="completeness-badge completeness-${m.completeness >= 70 ? 'high' : m.completeness >= 40 ? 'medium' : 'low'}">${m.completeness}%</span>
                </div>
                <div class="duplicate-option-meta">
                    Match type: <strong>${m.matchType}</strong> |
                    Meetings: ${m.client.dataSources ? m.client.dataSources.length : 0}
                </div>
                <button class="btn btn-primary btn-sm" onclick="BatchProcessor.resolveDuplicate('existing', ${i})">
                    Add to this client
                </button>
            </div>
        `).join('');

        body.innerHTML = `
            <div class="alert alert-warning">
                <strong>Duplicate Detected!</strong> The transcript "${App.escapeHtml(file.name)}" contains a client named
                <strong>${App.escapeHtml(nameInfo.firstName)} ${App.escapeHtml(nameInfo.lastName)}</strong>
                which matches existing client(s).
            </div>

            <h4 style="margin-bottom: 12px;">Existing matches:</h4>
            ${matchListHtml}

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                <p style="margin-bottom: 10px;">Or create a new, separate client record:</p>
                <button class="btn btn-secondary" onclick="BatchProcessor.resolveDuplicate('new')">
                    Create New Client
                </button>
                <button class="btn btn-secondary" style="margin-left: 10px;" onclick="BatchProcessor.resolveDuplicate('skip')">
                    Skip This File
                </button>
            </div>
        `;

        // Store context for resolution
        this._pendingDuplicate = { file, text, nameInfo, matches };

        App.showModal('duplicateModal');
    },

    // Resolve duplicate decision
    resolveDuplicate: async function(action, matchIndex) {
        App.hideModal('duplicateModal');

        const { file, text, nameInfo, matches } = this._pendingDuplicate;
        this._pendingDuplicate = null;

        try {
            if (action === 'existing') {
                // Add to existing client
                const match = matches[matchIndex];
                await this.processTranscriptForExistingClient(file, text, match.client);
            } else if (action === 'new') {
                // Create new client
                await this.processTranscriptForNewClient(file, text, nameInfo);
            } else {
                // Skip
                this.results.push({
                    fileName: file.name,
                    status: 'skipped',
                    message: 'Skipped by user'
                });
                this.updateFileStatus(this.currentIndex, 'skipped', 'Skipped');
            }
        } catch (error) {
            console.error('Error resolving duplicate:', error);
            this.results.push({
                fileName: file.name,
                status: 'error',
                message: error.message
            });
            this.updateFileStatus(this.currentIndex, 'error', error.message);
        }

        this.currentIndex++;
        await this.processNext();
    },

    // ========== UI RENDERING ==========

    // Render the batch processing panel
    renderBatchPanel: function() {
        const mainContent = document.getElementById('mainContent');

        mainContent.innerHTML = `
            <div class="content-header">
                <h2>Batch Transcript Processing</h2>
                <div class="header-actions">
                    <span class="batch-counter">${this.currentIndex} / ${this.queue.length} files</span>
                </div>
            </div>
            <div class="content-body">
                <div class="batch-progress-bar">
                    <div class="batch-progress-fill" id="batchProgressFill" style="width: 0%"></div>
                </div>

                <div class="card">
                    <div class="card-header">Processing Queue</div>
                    <div class="card-body" id="batchFileList">
                        ${this.queue.map((file, i) => `
                            <div class="batch-file-item" id="batchFile_${i}">
                                <div class="batch-file-name">${App.escapeHtml(file.name)}</div>
                                <div class="batch-file-status" id="batchFileStatus_${i}">
                                    <span class="batch-status-badge pending">Waiting</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div id="batchResultsArea"></div>
            </div>
        `;
    },

    // Update individual file status in the UI
    updateFileStatus: function(index, status, message) {
        const statusEl = document.getElementById(`batchFileStatus_${index}`);
        if (!statusEl) return;

        const badgeClass = {
            processing: 'processing',
            success: 'success',
            error: 'error',
            duplicate: 'duplicate',
            skipped: 'skipped'
        }[status] || 'pending';

        statusEl.innerHTML = `<span class="batch-status-badge ${badgeClass}">${App.escapeHtml(message)}</span>`;

        // Update progress bar
        const progressFill = document.getElementById('batchProgressFill');
        if (progressFill) {
            const pct = Math.round(((this.currentIndex + 1) / this.queue.length) * 100);
            progressFill.style.width = `${pct}%`;
        }

        // Update counter
        const counter = document.querySelector('.batch-counter');
        if (counter) {
            counter.textContent = `${this.currentIndex + 1} / ${this.queue.length} files`;
        }
    },

    // Render batch complete summary
    renderBatchComplete: async function() {
        await App.loadClientList();

        const resultsArea = document.getElementById('batchResultsArea');
        if (!resultsArea) return;

        const successCount = this.results.filter(r => r.status === 'success').length;
        const errorCount = this.results.filter(r => r.status === 'error').length;
        const skippedCount = this.results.filter(r => r.status === 'skipped').length;

        // Get unique clients created/updated
        const clientIds = [...new Set(this.results.filter(r => r.clientId).map(r => r.clientId))];

        resultsArea.innerHTML = `
            <div class="summary-card" style="margin-top: 20px;">
                <h4>Batch Processing Complete</h4>
                <div class="batch-summary-stats">
                    <div class="batch-stat">
                        <div class="batch-stat-value">${this.queue.length}</div>
                        <div class="batch-stat-label">Files Processed</div>
                    </div>
                    <div class="batch-stat">
                        <div class="batch-stat-value">${successCount}</div>
                        <div class="batch-stat-label">Successful</div>
                    </div>
                    <div class="batch-stat">
                        <div class="batch-stat-value">${clientIds.length}</div>
                        <div class="batch-stat-label">Clients Updated</div>
                    </div>
                    <div class="batch-stat">
                        <div class="batch-stat-value">${errorCount}</div>
                        <div class="batch-stat-label">Errors</div>
                    </div>
                    ${skippedCount > 0 ? `
                    <div class="batch-stat">
                        <div class="batch-stat-value">${skippedCount}</div>
                        <div class="batch-stat-label">Skipped</div>
                    </div>` : ''}
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span>Results Detail</span>
                    <div>
                        <button class="btn btn-sm btn-primary" onclick="BatchProcessor.exportAllClientFiles()">Export All Client Files</button>
                        <button class="btn btn-sm btn-secondary" onclick="App.showWelcome()">Done</button>
                    </div>
                </div>
                <div class="card-body">
                    ${this.results.map(r => `
                        <div class="batch-result-item ${r.status}">
                            <div class="batch-result-header">
                                <strong>${App.escapeHtml(r.fileName)}</strong>
                                <span class="batch-status-badge ${r.status}">${r.status}</span>
                            </div>
                            ${r.clientName ? `<div class="batch-result-client">Client: ${App.escapeHtml(r.clientName)}</div>` : ''}
                            ${r.fieldsUpdated ? `<div class="batch-result-meta">${r.fieldsUpdated} fields updated | Completeness: ${r.completeness}%</div>` : ''}
                            ${r.message ? `<div class="batch-result-meta">${App.escapeHtml(r.message)}</div>` : ''}
                            ${r.summary ? `<div class="batch-result-summary">${App.escapeHtml(r.summary)}</div>` : ''}
                            ${r.missingFields && r.missingFields.length > 0 ? `<div class="batch-result-missing">Missing: ${r.missingFields.join(', ')}</div>` : ''}
                            ${r.clientId ? `<button class="btn btn-sm btn-secondary" style="margin-top: 8px;" onclick="App.selectClient('${r.clientId}')">View Client</button>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // Export individual JSON files for all clients
    exportAllClientFiles: async function() {
        try {
            const clients = await Database.getAllClients();

            if (clients.length === 0) {
                App.showAlert('No clients to export', 'warning');
                return;
            }

            for (const client of clients) {
                const name = `${client.personal.firstName || 'Unknown'}_${client.personal.lastName || 'Client'}`.replace(/\s+/g, '_');
                const data = {
                    exportDate: new Date().toISOString(),
                    client: client,
                    transcriptCount: (client.dataSources || []).length,
                    dataCompleteness: client.dataCompleteness || 0
                };

                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `client_${name}_${new Date().toISOString().split('T')[0]}.json`;
                a.click();

                URL.revokeObjectURL(url);

                // Small delay between downloads to prevent browser blocking
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            App.showAlert(`Exported ${clients.length} client file(s)`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            App.showAlert('Export failed: ' + error.message, 'danger');
        }
    }
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.BatchProcessor = BatchProcessor;
}
