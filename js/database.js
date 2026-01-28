/**
 * Adviser AI - IndexedDB Database Layer
 * Handles all local storage operations
 */

const Database = {
    DB_NAME: 'AdviserAI',
    DB_VERSION: 1,
    STORES: {
        CLIENTS: 'clients',
        TRANSCRIPTS: 'transcripts',
        EXTRACTIONS: 'extractions'
    },
    db: null,

    // Initialize the database
    init: function() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Clients store
                if (!db.objectStoreNames.contains(this.STORES.CLIENTS)) {
                    const clientStore = db.createObjectStore(this.STORES.CLIENTS, { keyPath: 'id' });
                    clientStore.createIndex('lastName', 'personal.lastName', { unique: false });
                    clientStore.createIndex('email', 'personal.email', { unique: false });
                    clientStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }

                // Transcripts store
                if (!db.objectStoreNames.contains(this.STORES.TRANSCRIPTS)) {
                    const transcriptStore = db.createObjectStore(this.STORES.TRANSCRIPTS, { keyPath: 'id' });
                    transcriptStore.createIndex('clientId', 'clientId', { unique: false });
                    transcriptStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
                }

                // Extractions store (pending reviews)
                if (!db.objectStoreNames.contains(this.STORES.EXTRACTIONS)) {
                    const extractionStore = db.createObjectStore(this.STORES.EXTRACTIONS, { keyPath: 'id' });
                    extractionStore.createIndex('clientId', 'clientId', { unique: false });
                    extractionStore.createIndex('status', 'status', { unique: false });
                }

                console.log('Database schema created/updated');
            };
        });
    },

    // ========== CLIENT OPERATIONS ==========

    // Save a new client
    saveClient: function(client) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            // Ensure timestamps
            client.updatedAt = new Date().toISOString();
            if (!client.createdAt) {
                client.createdAt = client.updatedAt;
            }

            // Calculate completeness
            client.dataCompleteness = ClientSchema.calculateCompleteness(client);

            const transaction = this.db.transaction([this.STORES.CLIENTS], 'readwrite');
            const store = transaction.objectStore(this.STORES.CLIENTS);
            const request = store.put(client);

            request.onsuccess = () => {
                console.log('Client saved:', client.id);
                resolve(client);
            };

            request.onerror = (event) => {
                console.error('Error saving client:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // Get a client by ID
    getClient: function(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.STORES.CLIENTS], 'readonly');
            const store = transaction.objectStore(this.STORES.CLIENTS);
            const request = store.get(id);

            request.onsuccess = (event) => {
                resolve(event.target.result || null);
            };

            request.onerror = (event) => {
                console.error('Error getting client:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // Get all clients
    getAllClients: function() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.STORES.CLIENTS], 'readonly');
            const store = transaction.objectStore(this.STORES.CLIENTS);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const clients = event.target.result || [];
                // Sort by last name
                clients.sort((a, b) => {
                    const nameA = (a.personal.lastName || '').toLowerCase();
                    const nameB = (b.personal.lastName || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                resolve(clients);
            };

            request.onerror = (event) => {
                console.error('Error getting clients:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // Delete a client
    deleteClient: function(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.STORES.CLIENTS], 'readwrite');
            const store = transaction.objectStore(this.STORES.CLIENTS);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('Client deleted:', id);
                resolve(true);
            };

            request.onerror = (event) => {
                console.error('Error deleting client:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // ========== TRANSCRIPT OPERATIONS ==========

    // Save a transcript
    saveTranscript: function(transcript) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            if (!transcript.id) {
                transcript.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            }
            transcript.uploadedAt = transcript.uploadedAt || new Date().toISOString();

            const transaction = this.db.transaction([this.STORES.TRANSCRIPTS], 'readwrite');
            const store = transaction.objectStore(this.STORES.TRANSCRIPTS);
            const request = store.put(transcript);

            request.onsuccess = () => {
                console.log('Transcript saved:', transcript.id);
                resolve(transcript);
            };

            request.onerror = (event) => {
                console.error('Error saving transcript:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // Get transcripts for a client
    getTranscriptsForClient: function(clientId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.STORES.TRANSCRIPTS], 'readonly');
            const store = transaction.objectStore(this.STORES.TRANSCRIPTS);
            const index = store.index('clientId');
            const request = index.getAll(clientId);

            request.onsuccess = (event) => {
                resolve(event.target.result || []);
            };

            request.onerror = (event) => {
                console.error('Error getting transcripts:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // ========== EXTRACTION OPERATIONS ==========

    // Save an extraction (pending review)
    saveExtraction: function(extraction) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            if (!extraction.id) {
                extraction.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            }
            extraction.createdAt = extraction.createdAt || new Date().toISOString();
            extraction.status = extraction.status || 'pending'; // pending, approved, rejected

            const transaction = this.db.transaction([this.STORES.EXTRACTIONS], 'readwrite');
            const store = transaction.objectStore(this.STORES.EXTRACTIONS);
            const request = store.put(extraction);

            request.onsuccess = () => {
                console.log('Extraction saved:', extraction.id);
                resolve(extraction);
            };

            request.onerror = (event) => {
                console.error('Error saving extraction:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // Get pending extractions for a client
    getPendingExtractions: function(clientId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.STORES.EXTRACTIONS], 'readonly');
            const store = transaction.objectStore(this.STORES.EXTRACTIONS);
            const request = store.getAll();

            request.onsuccess = (event) => {
                let results = event.target.result || [];
                results = results.filter(e => e.clientId === clientId && e.status === 'pending');
                resolve(results);
            };

            request.onerror = (event) => {
                console.error('Error getting extractions:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    // Delete an extraction
    deleteExtraction: function(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.STORES.EXTRACTIONS], 'readwrite');
            const store = transaction.objectStore(this.STORES.EXTRACTIONS);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    // ========== UTILITY OPERATIONS ==========

    // Export all data
    exportAllData: function() {
        return new Promise(async (resolve, reject) => {
            try {
                const clients = await this.getAllClients();
                const transcripts = await this._getAllFromStore(this.STORES.TRANSCRIPTS);
                const extractions = await this._getAllFromStore(this.STORES.EXTRACTIONS);

                resolve({
                    exportDate: new Date().toISOString(),
                    version: this.DB_VERSION,
                    clients: clients,
                    transcripts: transcripts,
                    extractions: extractions
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    // Import data
    importData: function(data) {
        return new Promise(async (resolve, reject) => {
            try {
                if (data.clients) {
                    for (const client of data.clients) {
                        await this.saveClient(client);
                    }
                }
                if (data.transcripts) {
                    for (const transcript of data.transcripts) {
                        await this.saveTranscript(transcript);
                    }
                }
                if (data.extractions) {
                    for (const extraction of data.extractions) {
                        await this.saveExtraction(extraction);
                    }
                }
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    },

    // Helper to get all from any store
    _getAllFromStore: function(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result || []);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    // Clear all data (use with caution!)
    clearAllData: function() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                [this.STORES.CLIENTS, this.STORES.TRANSCRIPTS, this.STORES.EXTRACTIONS],
                'readwrite'
            );

            transaction.objectStore(this.STORES.CLIENTS).clear();
            transaction.objectStore(this.STORES.TRANSCRIPTS).clear();
            transaction.objectStore(this.STORES.EXTRACTIONS).clear();

            transaction.oncomplete = () => {
                console.log('All data cleared');
                resolve(true);
            };

            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.Database = Database;
}
