/**
 * Adviser AI - Transcript Extraction Engine
 * Handles AI-powered data extraction from meeting transcripts
 */

const Extraction = {
    PROVIDERS: {
        CLAUDE: 'claude',
        OPENAI: 'openai'
    },
    API_URLS: {
        claude: 'https://api.anthropic.com/v1/messages',
        openai: 'https://api.openai.com/v1/responses'
    },
    apiKey: null,
    provider: null,
    model: null,

    // Set the API key for a provider
    setApiKey: function(provider, key) {
        const storageKey = provider === this.PROVIDERS.OPENAI
            ? 'adviserAI_apiKey_openai'
            : 'adviserAI_apiKey_claude';
        if (provider === this.PROVIDERS.OPENAI) {
            this.apiKeyOpenAI = key;
        } else {
            this.apiKeyClaude = key;
        }
        localStorage.setItem(storageKey, key);
    },

    // Get the API key for current provider
    getApiKey: function() {
        const provider = this.getProvider();
        if (provider === this.PROVIDERS.OPENAI) {
            if (!this.apiKeyOpenAI) {
                this.apiKeyOpenAI = localStorage.getItem('adviserAI_apiKey_openai') || null;
            }
            return this.apiKeyOpenAI;
        }
        if (!this.apiKeyClaude) {
            this.apiKeyClaude = localStorage.getItem('adviserAI_apiKey_claude') || null;
        }
        return this.apiKeyClaude;
    },

    setProvider: function(provider) {
        this.provider = provider;
        localStorage.setItem('adviserAI_provider', provider);
    },

    getProvider: function() {
        if (!this.provider) {
            this.provider = localStorage.getItem('adviserAI_provider') || this.PROVIDERS.CLAUDE;
        }
        return this.provider;
    },

    setModel: function(model) {
        this.model = model;
        localStorage.setItem('adviserAI_model', model);
    },

    getModel: function() {
        if (!this.model) {
            this.model = localStorage.getItem('adviserAI_model') || 'claude-opus-4-20250514';
        }
        return this.model;
    },

    // Extract data from transcript using configured provider
    extractFromTranscript: async function(transcriptText, existingClient = null) {
        const apiKey = this.getApiKey();
        const provider = this.getProvider();
        const model = this.getModel();

        if (!apiKey) {
            // Return demo extraction if no API key
            return this.getDemoExtraction();
        }

        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = this.buildUserPrompt(transcriptText, existingClient);

        try {
            const response = await fetch(this.API_URLS[provider], {
                method: 'POST',
                headers: provider === this.PROVIDERS.OPENAI ? {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                } : {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: provider === this.PROVIDERS.OPENAI
                    ? JSON.stringify({
                        model: model || 'gpt-4o',
                        input: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        text: { format: { type: 'json' } },
                        max_output_tokens: 4096
                    })
                    : JSON.stringify({
                        model: model || 'claude-opus-4-20250514',
                        max_tokens: 4096,
                        system: systemPrompt,
                        messages: [
                            { role: 'user', content: userPrompt }
                        ]
                    })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const data = await response.json();
            const extractedText = provider === this.PROVIDERS.OPENAI
                ? (data.output_text || data.output?.[0]?.content?.[0]?.text || '')
                : (data.content?.[0]?.text || '');

            // Parse the JSON response
            const extraction = this.parseExtractionResponse(extractedText);
            if (!extraction.success) return extraction;

            // Second pass for missing financial assets
            const missing = this.findMissingFinancials(extraction.data);
            if (missing.length > 0) {
                const followup = await this.extractFinancialsOnly(transcriptText, provider, apiKey, model);
                if (followup.success) {
                    extraction.data = this.mergeExtractionData(extraction.data, followup.data);
                }
            }
            return extraction;

        } catch (error) {
            console.error('Extraction error:', error);
            throw error;
        }
    },

    findMissingFinancials: function(data) {
        const missing = [];
        if (!data || typeof data !== 'object') return ['bankAccounts', 'investments', 'pensions', 'properties'];
        if (!Array.isArray(data.bankAccounts) || data.bankAccounts.length === 0) missing.push('bankAccounts');
        if (!Array.isArray(data.investments) || data.investments.length === 0) missing.push('investments');
        if (!Array.isArray(data.pensions) || data.pensions.length === 0) missing.push('pensions');
        if (!Array.isArray(data.properties) || data.properties.length === 0) missing.push('properties');
        return missing;
    },

    extractFinancialsOnly: async function(transcriptText, provider, apiKey, model) {
        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = `Extract ONLY financial assets and liabilities from the transcript.

Return JSON object:
{
  "extractedData": {
    "bankAccounts": [ { "bank": { "value": "...", "confidence": 0.9 }, "balance": { "value": 1234, "confidence": 0.8 }, "currency": { "value": "GBP", "confidence": 0.9 } } ],
    "investments": [ { "provider": { "value": "...", "confidence": 0.9 }, "currentValue": { "value": 1234, "confidence": 0.8 }, "currency": { "value": "GBP", "confidence": 0.9 }, "type": { "value": "...", "confidence": 0.7 } } ],
    "pensions": [ { "provider": { "value": "...", "confidence": 0.9 }, "currentValue": { "value": 1234, "confidence": 0.8 }, "currency": { "value": "GBP", "confidence": 0.9 }, "type": { "value": "...", "confidence": 0.7 } } ],
    "properties": [ { "address": { "line1": { "value": "...", "confidence": 0.7 }, "city": { "value": "...", "confidence": 0.8 }, "country": { "value": "...", "confidence": 0.8 } }, "currentValue": { "value": 1234, "confidence": 0.8 }, "currency": { "value": "GBP", "confidence": 0.9 }, "mortgageBalance": { "value": 1000, "confidence": 0.8 } } ],
    "debts": [ { "provider": { "value": "...", "confidence": 0.9 }, "outstandingBalance": { "value": 1234, "confidence": 0.8 }, "currency": { "value": "GBP", "confidence": 0.9 }, "type": { "value": "...", "confidence": 0.7 } } ]
  }
}

Return ONLY the JSON. Use null and confidence 0 if not mentioned.

TRANSCRIPT:
---
${transcriptText}
---`;

        const response = await fetch(this.API_URLS[provider], {
            method: 'POST',
            headers: provider === this.PROVIDERS.OPENAI ? {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            } : {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: provider === this.PROVIDERS.OPENAI
                ? JSON.stringify({
                    model: model || 'gpt-4o',
                    input: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    text: { format: { type: 'json' } },
                    max_output_tokens: 4096
                })
                : JSON.stringify({
                    model: model || 'claude-opus-4-20250514',
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: userPrompt }
                    ]
                })
        });

        if (!response.ok) {
            return { success: false };
        }

        const data = await response.json();
        const extractedText = provider === this.PROVIDERS.OPENAI
            ? (data.output_text || data.output?.[0]?.content?.[0]?.text || '')
            : (data.content?.[0]?.text || '');
        return this.parseExtractionResponse(extractedText);
    },

    mergeExtractionData: function(base, extra) {
        const result = JSON.parse(JSON.stringify(base || {}));
        const merge = (target, source) => {
            if (!source || typeof source !== 'object') return;
            for (const key of Object.keys(source)) {
                const val = source[key];
                if (Array.isArray(val)) {
                    if (!Array.isArray(target[key])) target[key] = [];
                    if (val.length > 0) target[key] = val;
                } else if (val && typeof val === 'object') {
                    if (!target[key]) target[key] = {};
                    merge(target[key], val);
                } else {
                    target[key] = val;
                }
            }
        };
        merge(result, extra);
        return result;
    },

    // Build the system prompt for extraction
    buildSystemPrompt: function() {
        return `You are a financial data extraction assistant. Your job is to extract client information from meeting transcripts for a financial advisor.

IMPORTANT RULES:
1. Extract ONLY information that is explicitly stated in the transcript
2. Do NOT make assumptions or infer data that isn't clearly stated
3. For each extracted field, provide a confidence score (0.0 to 1.0)
4. Use null for fields where no information was found
5. Convert all monetary values to numbers (remove currency symbols)
6. Include the original currency for monetary values
7. Convert dates to ISO format (YYYY-MM-DD) where possible
8. For age, calculate from DOB if DOB is given but age is not stated
9. CRITICAL: Capture ALL financial assets and liabilities mentioned, including bank accounts, cash, investments, pensions, properties, and debts.

Respond ONLY with a valid JSON object in the exact format specified. Do not include any explanation or markdown.`;
    },

    // Build the user prompt with transcript
    buildUserPrompt: function(transcriptText, existingClient) {
        let prompt = `Extract all client information from the following meeting transcript.

Return a JSON object with this structure (fill ALL financial assets/liabilities if mentioned):
{
    "extractedData": {
        "personal": {
            "firstName": { "value": "...", "confidence": 0.95 },
            "lastName": { "value": "...", "confidence": 0.95 },
            "dateOfBirth": { "value": "YYYY-MM-DD", "confidence": 0.9 },
            "age": { "value": 55, "confidence": 0.95 },
            "email": { "value": "...", "confidence": 0.8 },
            "phoneMobile": { "value": "...", "confidence": 0.8 },
            "countryOfResidence": { "value": "...", "confidence": 0.9 },
            "nationality": { "value": "...", "confidence": 0.85 },
            "relationshipStatus": { "value": "...", "confidence": 0.9 },
            "address": {
                "city": { "value": "...", "confidence": 0.8 },
                "country": { "value": "...", "confidence": 0.9 }
            }
        },
        "employment": {
            "status": { "value": "Employed", "confidence": 0.95 },
            "jobTitle": { "value": "...", "confidence": 0.9 },
            "employer": { "value": "...", "confidence": 0.95 },
            "monthlyGrossIncome": { "value": 22500, "confidence": 0.9 },
            "incomeCurrency": { "value": "USD", "confidence": 0.85 },
            "retirementAge": { "value": 65, "confidence": 0.9 }
        },
        "goals": {
            "shortTerm": { "value": "...", "confidence": 0.8 },
            "mediumTerm": { "value": "...", "confidence": 0.7 },
            "longTerm": { "value": "...", "confidence": 0.85 },
            "retirementAge": { "value": 65, "confidence": 0.9 },
            "retirementLocation": { "value": "...", "confidence": 0.8 }
        },
        "children": [
            {
                "inEducation": { "value": true, "confidence": 0.8 },
                "school": { "value": "University", "confidence": 0.7 }
            }
        ],
        "pensions": [
            {
                "type": { "value": "Superannuation", "confidence": 0.9 },
                "currentValue": { "value": 320000, "confidence": 0.85 },
                "currency": { "value": "AUD", "confidence": 0.9 },
                "annualGrowthRate": { "value": 6.5, "confidence": 0.7 }
            }
        ],
        "properties": [
            {
                "address": {
                    "state": { "value": "Queensland", "confidence": 0.9 },
                    "country": { "value": "Australia", "confidence": 0.95 }
                },
                "currentValue": { "value": 1500000, "confidence": 0.9 },
                "currency": { "value": "AUD", "confidence": 0.95 },
                "mortgageBalance": { "value": 1100000, "confidence": 0.9 }
            }
        ]
    },
    "summary": "Brief summary of key findings",
    "missingCriticalFields": ["list", "of", "important", "missing", "fields"]
}

For any field not mentioned in the transcript, set value to null and confidence to 0.

`;

        if (existingClient) {
            prompt += `\nEXISTING CLIENT DATA (flag any conflicts):
${JSON.stringify(existingClient, null, 2)}

`;
        }

        prompt += `TRANSCRIPT:
---
${transcriptText}
---

Extract all available information and return ONLY the JSON object.`;

        return prompt;
    },

    // Parse the extraction response from Claude
    parseExtractionResponse: function(responseText) {
        try {
            // Try to extract JSON from the response
            let jsonStr = responseText.trim();

            // If wrapped in markdown code blocks, extract the JSON
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }

            const parsed = JSON.parse(jsonStr);

            return {
                success: true,
                data: parsed.extractedData,
                summary: parsed.summary || 'Data extracted successfully',
                missingFields: parsed.missingCriticalFields || [],
                rawResponse: responseText
            };
        } catch (error) {
            console.error('Failed to parse extraction response:', error);
            return {
                success: false,
                error: 'Failed to parse AI response',
                rawResponse: responseText
            };
        }
    },

    // Convert extracted data with confidence scores to flat client data
    flattenExtractedData: function(extractedData) {
        const result = {};

        const flatten = (obj, prefix = '') => {
            for (const key in obj) {
                const value = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;

                if (value && typeof value === 'object') {
                    if ('value' in value && 'confidence' in value) {
                        // This is a value-confidence pair
                        result[newKey] = {
                            value: value.value,
                            confidence: value.confidence
                        };
                    } else if (Array.isArray(value)) {
                        // Handle arrays
                        result[newKey] = value.map((item, index) => {
                            if (typeof item === 'object') {
                                const flatItem = {};
                                flatten(item, '');
                                return flatItem;
                            }
                            return item;
                        });
                    } else {
                        // Nested object, recurse
                        flatten(value, newKey);
                    }
                }
            }
        };

        flatten(extractedData);
        return result;
    },

    // Merge extracted data into existing client
    mergeIntoClient: function(existingClient, extractedData, approvedFields) {
        const client = JSON.parse(JSON.stringify(existingClient)); // Deep clone
        const changes = [];

        const setNestedValue = (obj, path, value) => {
            const parts = path.split('.');
            let current = obj;

            for (let i = 0; i < parts.length - 1; i++) {
                if (!(parts[i] in current)) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }

            const finalKey = parts[parts.length - 1];
            const oldValue = current[finalKey];

            if (oldValue !== value) {
                changes.push({
                    field: path,
                    oldValue: oldValue,
                    newValue: value
                });
                current[finalKey] = value;
            }
        };

        // Apply approved fields
        for (const fieldPath of approvedFields) {
            const extracted = this.getNestedValue(extractedData, fieldPath);
            if (extracted && extracted.value !== null) {
                setNestedValue(client, fieldPath, extracted.value);
            }
        }

        // Update version and history
        client.version = (client.version || 0) + 1;
        client.updatedAt = new Date().toISOString();

        if (changes.length > 0) {
            client.history = client.history || [];
            client.history.push({
                date: new Date().toISOString(),
                source: 'transcript_extraction',
                changes: changes
            });
        }

        return client;
    },

    // Get nested value from object using dot notation
    getNestedValue: function(obj, path) {
        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }

        return current;
    },

    // Find conflicts between extracted data and existing client
    findConflicts: function(existingClient, extractedData) {
        const conflicts = [];

        const checkConflicts = (extracted, existing, path = '') => {
            for (const key in extracted) {
                const currentPath = path ? `${path}.${key}` : key;
                const extractedValue = extracted[key];

                if (extractedValue && typeof extractedValue === 'object') {
                    if ('value' in extractedValue && 'confidence' in extractedValue) {
                        // This is a value-confidence pair
                        const existingValue = this.getNestedValue(existing, currentPath);

                        if (existingValue !== null &&
                            existingValue !== undefined &&
                            existingValue !== '' &&
                            extractedValue.value !== null &&
                            existingValue !== extractedValue.value) {
                            conflicts.push({
                                field: currentPath,
                                existingValue: existingValue,
                                extractedValue: extractedValue.value,
                                confidence: extractedValue.confidence
                            });
                        }
                    } else if (!Array.isArray(extractedValue)) {
                        // Nested object, recurse
                        checkConflicts(extractedValue, existing, currentPath);
                    }
                }
            }
        };

        checkConflicts(extractedData, existingClient);
        return conflicts;
    },

    // Demo extraction for testing without API key
    getDemoExtraction: function() {
        return {
            success: true,
            data: {
                personal: {
                    firstName: { value: 'Simon', confidence: 0.95 },
                    lastName: { value: 'Shaw', confidence: 0.95 },
                    dateOfBirth: { value: '1970-04-16', confidence: 0.9 },
                    age: { value: 55, confidence: 0.95 },
                    countryOfResidence: { value: 'Saudi Arabia', confidence: 0.9 },
                    nationality: { value: 'Australian', confidence: 0.85 },
                    relationshipStatus: { value: 'Divorced', confidence: 0.9 }
                },
                employment: {
                    status: { value: 'Employed', confidence: 0.95 },
                    jobTitle: { value: 'Trojan Project', confidence: 0.7 },
                    employer: { value: 'NEOM', confidence: 0.95 },
                    monthlyGrossIncome: { value: 85000, confidence: 0.9 },
                    incomeCurrency: { value: 'SAR', confidence: 0.95 },
                    retirementAge: { value: 65, confidence: 0.9 }
                },
                goals: {
                    longTerm: { value: 'Retirement planning, tax-efficient savings', confidence: 0.85 },
                    retirementAge: { value: 65, confidence: 0.9 },
                    retirementLocation: { value: 'Australia', confidence: 0.85 }
                },
                children: [
                    {
                        inEducation: { value: true, confidence: 0.8 },
                        school: { value: 'University in Australia', confidence: 0.75 }
                    }
                ],
                pensions: [
                    {
                        type: { value: 'Superannuation', confidence: 0.9 },
                        currentValue: { value: 320000, confidence: 0.85 },
                        currency: { value: 'AUD', confidence: 0.9 },
                        annualGrowthRate: { value: 6.5, confidence: 0.7 }
                    }
                ],
                properties: [
                    {
                        address: {
                            state: { value: 'Queensland', confidence: 0.9 },
                            country: { value: 'Australia', confidence: 0.95 }
                        },
                        currentValue: { value: 1500000, confidence: 0.9 },
                        currency: { value: 'AUD', confidence: 0.95 },
                        mortgageBalance: { value: 1100000, confidence: 0.9 }
                    }
                ]
            },
            summary: 'Extracted data for Simon Shaw (age 55), currently working at NEOM in Saudi Arabia. Key financial items include property in Queensland (AUD $1.5M with $1.1M mortgage) and superannuation of AUD $320K. Primary goal is retirement planning with return to Australia at age 65.',
            missingFields: ['email', 'phone', 'spouse details', 'detailed expenditure'],
            isDemo: true
        };
    }
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.Extraction = Extraction;
}
