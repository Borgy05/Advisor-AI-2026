/**
 * Adviser AI - Transcript Extraction Engine
 * Handles AI-powered data extraction from meeting transcripts
 */

const Extraction = {
    API_URL: 'https://api.anthropic.com/v1/messages',
    apiKey: null,

    // Set the API key
    setApiKey: function(key) {
        this.apiKey = key;
        localStorage.setItem('adviserAI_apiKey', key);
    },

    // Get the API key
    getApiKey: function() {
        if (!this.apiKey) {
            this.apiKey = localStorage.getItem('adviserAI_apiKey') || null;
        }
        return this.apiKey;
    },

    // Extract data from transcript using Claude API
    extractFromTranscript: async function(transcriptText, existingClient = null) {
        const apiKey = this.getApiKey();

        if (!apiKey) {
            // Return demo extraction if no API key
            return this.getDemoExtraction();
        }

        const systemPrompt = this.buildSystemPrompt();
        const userPrompt = this.buildUserPrompt(transcriptText, existingClient);

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
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
            const extractedText = data.content[0].text;

            // Parse the JSON response
            const extraction = this.parseExtractionResponse(extractedText);
            return extraction;

        } catch (error) {
            console.error('Extraction error:', error);
            throw error;
        }
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

Respond ONLY with a valid JSON object in the exact format specified. Do not include any explanation or markdown.`;
    },

    // Build the user prompt with transcript
    buildUserPrompt: function(transcriptText, existingClient) {
        let prompt = `Extract all client information from the following meeting transcript.

Return a JSON object with this structure:
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
