/**
 * Adviser AI - Main Application
 */

const App = {
    currentClientId: null,
    currentClient: null,
    currentExtraction: null,

    // Initialize the application
    init: async function() {
        console.log('Initializing Adviser AI...');

        try {
            // Initialize database
            await Database.init();
            console.log('Database initialized');

            // Set up event listeners
            this.setupEventListeners();

            // Load client list
            await this.loadClientList();

            console.log('Application ready');
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.showAlert('Failed to initialize application: ' + error.message, 'danger');
        }
    },

    // Set up all event listeners
    setupEventListeners: function() {
        // Add client button
        document.getElementById('btnAddClient').addEventListener('click', () => {
            this.showModal('addClientModal');
        });

        // Add client form submission
        document.getElementById('addClientForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddClient();
        });

        // Batch upload button
        document.getElementById('btnBatchUpload').addEventListener('click', () => {
            this.showBatchUploadView();
        });

        // Batch file input
        document.getElementById('batchTranscriptFiles').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                BatchProcessor.startBatch(e.target.files);
                e.target.value = ''; // Reset
            }
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, .btn-cancel-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Modal overlay click to close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideModal(overlay.id);
                }
            });
        });

        // Transcript upload
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                document.getElementById('transcriptFile').click();
            });

            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleTranscriptUpload(files[0]);
                }
            });
        }

        document.getElementById('transcriptFile').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleTranscriptUpload(e.target.files[0]);
            }
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // API Key save button
        document.getElementById('btnSaveApiKey').addEventListener('click', () => {
            this.saveApiKey();
        });

        // Approve extraction button
        document.getElementById('btnApproveExtraction').addEventListener('click', () => {
            this.approveExtraction();
        });

        // Reject extraction button
        document.getElementById('btnRejectExtraction').addEventListener('click', () => {
            this.rejectExtraction();
        });

        // Export data button
        document.getElementById('btnExportData')?.addEventListener('click', () => {
            this.exportData();
        });

        // Delete client button
        document.getElementById('btnDeleteClient')?.addEventListener('click', () => {
            this.deleteCurrentClient();
        });

        // Load saved API key
        const savedKey = Extraction.getApiKey();
        if (savedKey) {
            document.getElementById('apiKey').value = savedKey;
        }
    },

    // Load and display client list
    loadClientList: async function() {
        try {
            const clients = await Database.getAllClients();
            const listContainer = document.getElementById('clientList');

            if (clients.length === 0) {
                listContainer.innerHTML = '<div class="empty-state">No clients yet.<br>Click "Add Client" to get started.</div>';
                return;
            }

            listContainer.innerHTML = clients.map(client => {
                const name = `${client.personal.firstName || ''} ${client.personal.lastName || ''}`.trim() || 'Unnamed';
                const completeness = client.dataCompleteness || 0;
                let completenessClass = 'low';
                if (completeness >= 70) completenessClass = 'high';
                else if (completeness >= 40) completenessClass = 'medium';

                return `
                    <div class="client-list-item ${client.id === this.currentClientId ? 'active' : ''}"
                         data-id="${client.id}" onclick="App.selectClient('${client.id}')">
                        <div class="client-name">${this.escapeHtml(name)}</div>
                        <div class="client-meta">
                            <span>${client.personal.email || 'No email'}</span>
                            <span class="completeness-badge completeness-${completenessClass}">${completeness}%</span>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    },

    // Select a client
    selectClient: async function(clientId) {
        try {
            const client = await Database.getClient(clientId);
            if (!client) {
                this.showAlert('Client not found', 'danger');
                return;
            }

            this.currentClientId = clientId;
            this.currentClient = client;

            // Update sidebar active state
            document.querySelectorAll('.client-list-item').forEach(item => {
                item.classList.toggle('active', item.dataset.id === clientId);
            });

            // Show client view
            this.renderClientView(client);

        } catch (error) {
            console.error('Failed to select client:', error);
            this.showAlert('Failed to load client: ' + error.message, 'danger');
        }
    },

    // Render the client view
    renderClientView: function(client) {
        const mainContent = document.getElementById('mainContent');
        const name = `${client.personal.firstName || ''} ${client.personal.lastName || ''}`.trim() || 'Unnamed';
        const initials = this.getInitials(name);
        const completeness = client.dataCompleteness || 0;

        let completenessClass = 'low';
        if (completeness >= 70) completenessClass = 'high';
        else if (completeness >= 40) completenessClass = 'medium';

        mainContent.innerHTML = `
            <div class="content-header">
                <h2>Client Profile</h2>
                <div class="header-actions">
                    <button class="btn btn-secondary" id="btnExportData">Export</button>
                    <button class="btn btn-danger" id="btnDeleteClient">Delete</button>
                </div>
            </div>
            <div class="content-body">
                <div class="client-header">
                    <div class="client-avatar">${initials}</div>
                    <div class="client-info">
                        <h2>${this.escapeHtml(name)}</h2>
                        <p>${client.personal.email || 'No email'} | ${client.personal.phoneMobile || 'No phone'}</p>
                        <div style="width: 200px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="font-size: 0.8rem; color: var(--text-secondary);">Data Completeness</span>
                                <span style="font-size: 0.8rem; font-weight: 600;">${completeness}%</span>
                            </div>
                            <div class="completeness-bar">
                                <div class="completeness-fill ${completenessClass}" style="width: ${completeness}%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tabs">
                    <button class="tab active" data-tab="overview">Overview</button>
                    <button class="tab" data-tab="personal">Personal</button>
                    <button class="tab" data-tab="employment">Employment</button>
                    <button class="tab" data-tab="financial">Financial</button>
                    <button class="tab" data-tab="goals">Goals & Risk</button>
                    <button class="tab" data-tab="upload">Upload Transcript</button>
                    <button class="tab" data-tab="settings">Settings</button>
                </div>

                <div id="tabContent">
                    ${this.renderOverviewTab(client)}
                </div>
            </div>
        `;

        // Re-attach event listeners for new elements
        this.attachClientViewListeners();
    },

    // Attach event listeners for client view
    attachClientViewListeners: function() {
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Delete button
        document.getElementById('btnDeleteClient')?.addEventListener('click', () => {
            this.deleteCurrentClient();
        });

        // Export button
        document.getElementById('btnExportData')?.addEventListener('click', () => {
            this.exportClientData();
        });
    },

    // Switch tabs
    switchTab: function(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Render tab content
        const tabContent = document.getElementById('tabContent');
        const client = this.currentClient;

        switch (tabName) {
            case 'overview':
                tabContent.innerHTML = this.renderOverviewTab(client);
                break;
            case 'personal':
                tabContent.innerHTML = this.renderPersonalTab(client);
                break;
            case 'employment':
                tabContent.innerHTML = this.renderEmploymentTab(client);
                break;
            case 'financial':
                tabContent.innerHTML = this.renderFinancialTab(client);
                break;
            case 'goals':
                tabContent.innerHTML = this.renderGoalsTab(client);
                break;
            case 'upload':
                tabContent.innerHTML = this.renderUploadTab();
                this.attachUploadListeners();
                break;
            case 'settings':
                tabContent.innerHTML = this.renderSettingsTab();
                this.attachSettingsListeners();
                break;
        }
    },

    // Render overview tab
    renderOverviewTab: function(client) {
        const hasChildren = client.children && client.children.length > 0;
        const hasPensions = client.pensions && client.pensions.length > 0;
        const hasProperties = client.properties && client.properties.length > 0;
        const hasInvestments = client.investments && client.investments.length > 0;

        return `
            <div class="data-grid">
                <div class="card">
                    <div class="card-header">Personal Details</div>
                    <div class="card-body">
                        ${this.renderField('Name', `${client.personal.firstName || ''} ${client.personal.lastName || ''}`.trim())}
                        ${this.renderField('Date of Birth', client.personal.dateOfBirth)}
                        ${this.renderField('Age', client.personal.age)}
                        ${this.renderField('Relationship Status', client.personal.relationshipStatus)}
                        ${this.renderField('Country of Residence', client.personal.countryOfResidence)}
                        ${this.renderField('Nationality', client.personal.nationality)}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">Employment</div>
                    <div class="card-body">
                        ${this.renderField('Status', client.employment.status)}
                        ${this.renderField('Employer', client.employment.employer)}
                        ${this.renderField('Job Title', client.employment.jobTitle)}
                        ${this.renderField('Monthly Income', this.formatCurrency(client.employment.monthlyGrossIncome, client.employment.incomeCurrency))}
                        ${this.renderField('Retirement Age', client.employment.retirementAge)}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">Goals & Objectives</div>
                    <div class="card-body">
                        ${this.renderField('Short Term', client.goals.shortTerm)}
                        ${this.renderField('Long Term', client.goals.longTerm)}
                        ${this.renderField('Retirement Age', client.goals.retirementAge)}
                        ${this.renderField('Retirement Location', client.goals.retirementLocation)}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">Assets Summary</div>
                    <div class="card-body">
                        ${this.renderField('Properties', hasProperties ? `${client.properties.length} property/ies` : null)}
                        ${this.renderField('Pensions', hasPensions ? `${client.pensions.length} pension(s)` : null)}
                        ${this.renderField('Investments', hasInvestments ? `${client.investments.length} investment(s)` : null)}
                        ${this.renderField('Children', hasChildren ? `${client.children.length} child(ren)` : null)}
                    </div>
                </div>
            </div>
        `;
    },

    // Render personal tab
    renderPersonalTab: function(client) {
        return `
            <div class="card">
                <div class="card-header">Client Details</div>
                <div class="card-body">
                    <div class="data-grid">
                        ${this.renderField('Title', client.personal.title)}
                        ${this.renderField('First Name', client.personal.firstName)}
                        ${this.renderField('Last Name', client.personal.lastName)}
                        ${this.renderField('Preferred Name', client.personal.preferredName)}
                        ${this.renderField('Date of Birth', client.personal.dateOfBirth)}
                        ${this.renderField('Age', client.personal.age)}
                        ${this.renderField('Gender', client.personal.gender)}
                        ${this.renderField('Relationship Status', client.personal.relationshipStatus)}
                        ${this.renderField('Date of Marriage', client.personal.dateOfMarriage)}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Contact Information</div>
                <div class="card-body">
                    <div class="data-grid">
                        ${this.renderField('Email', client.personal.email)}
                        ${this.renderField('Mobile', client.personal.phoneMobile)}
                        ${this.renderField('Home Phone', client.personal.phoneHome)}
                        ${this.renderField('Work Phone', client.personal.phoneWork)}
                        ${this.renderField('Address', this.formatAddress(client.personal.address))}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Nationality & Tax</div>
                <div class="card-body">
                    <div class="data-grid">
                        ${this.renderField('Country of Residence', client.personal.countryOfResidence)}
                        ${this.renderField('Nationality', client.personal.nationality)}
                        ${this.renderField('Dual Nationality', client.personal.dualNationality)}
                        ${this.renderField('Tax Residency', client.personal.taxResidency)}
                        ${this.renderField('Tax ID Number', client.personal.taxIdentificationNumber)}
                        ${this.renderField('NI Number', client.personal.nationalInsuranceNumber)}
                        ${this.renderField('PEP Status', client.personal.isPoliticallyExposedPerson === null ? null : (client.personal.isPoliticallyExposedPerson ? 'Yes' : 'No'))}
                    </div>
                </div>
            </div>

            ${client.personal.relationshipStatus && client.personal.relationshipStatus !== 'Single' ? `
            <div class="card">
                <div class="card-header">Spouse/Partner Details</div>
                <div class="card-body">
                    <div class="data-grid">
                        ${this.renderField('Name', `${client.spouse.firstName || ''} ${client.spouse.lastName || ''}`.trim())}
                        ${this.renderField('Date of Birth', client.spouse.dateOfBirth)}
                        ${this.renderField('Age', client.spouse.age)}
                        ${this.renderField('Email', client.spouse.email)}
                        ${this.renderField('Mobile', client.spouse.phoneMobile)}
                        ${this.renderField('Nationality', client.spouse.nationality)}
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="card">
                <div class="card-header">Children/Dependants (${client.children?.length || 0})</div>
                <div class="card-body">
                    ${client.children && client.children.length > 0 ? client.children.map((child, i) => `
                        <div class="array-item">
                            <div class="array-item-header">
                                <span class="array-item-title">Child ${i + 1}</span>
                            </div>
                            <div class="data-grid">
                                ${this.renderField('Name', `${child.firstName || ''} ${child.lastName || ''}`.trim())}
                                ${this.renderField('Date of Birth', child.dateOfBirth)}
                                ${this.renderField('Age', child.age)}
                                ${this.renderField('Relationship', child.relationship)}
                                ${this.renderField('In Education', child.inEducation === null ? null : (child.inEducation ? 'Yes' : 'No'))}
                                ${this.renderField('School', child.school)}
                                ${this.renderField('Annual Fees', this.formatCurrency(child.annualSchoolFees, child.schoolFeesCurrency))}
                            </div>
                        </div>
                    `).join('') : '<p class="empty-state">No children/dependants recorded</p>'}
                </div>
            </div>
        `;
    },

    // Render employment tab
    renderEmploymentTab: function(client) {
        return `
            <div class="card">
                <div class="card-header">Client Employment</div>
                <div class="card-body">
                    <div class="data-grid">
                        ${this.renderField('Status', client.employment.status)}
                        ${this.renderField('Job Title', client.employment.jobTitle)}
                        ${this.renderField('Employer', client.employment.employer)}
                        ${this.renderField('Industry', client.employment.industry)}
                        ${this.renderField('Years in Role', client.employment.yearsInRole)}
                        ${this.renderField('Contract Type', client.employment.contractType)}
                        ${this.renderField('Contract End Date', client.employment.contractEndDate)}
                        ${this.renderField('Monthly Gross Income', this.formatCurrency(client.employment.monthlyGrossIncome, client.employment.incomeCurrency))}
                        ${this.renderField('Monthly Net Income', this.formatCurrency(client.employment.monthlyNetIncome, client.employment.incomeCurrency))}
                        ${this.renderField('Annual Bonus', this.formatCurrency(client.employment.annualBonus, client.employment.incomeCurrency))}
                        ${this.renderField('Other Benefits', client.employment.otherBenefits)}
                        ${this.renderField('Monthly Surplus', this.formatCurrency(client.employment.monthlySurplus, client.employment.incomeCurrency))}
                        ${this.renderField('Planned Retirement Age', client.employment.retirementAge)}
                    </div>
                </div>
            </div>

            ${client.personal.relationshipStatus && client.personal.relationshipStatus !== 'Single' ? `
            <div class="card">
                <div class="card-header">Spouse Employment</div>
                <div class="card-body">
                    <div class="data-grid">
                        ${this.renderField('Status', client.spouseEmployment.status)}
                        ${this.renderField('Job Title', client.spouseEmployment.jobTitle)}
                        ${this.renderField('Employer', client.spouseEmployment.employer)}
                        ${this.renderField('Monthly Gross Income', this.formatCurrency(client.spouseEmployment.monthlyGrossIncome, client.spouseEmployment.incomeCurrency))}
                        ${this.renderField('Annual Bonus', this.formatCurrency(client.spouseEmployment.annualBonus, client.spouseEmployment.incomeCurrency))}
                    </div>
                </div>
            </div>
            ` : ''}
        `;
    },

    // Render financial tab
    renderFinancialTab: function(client) {
        return `
            <div class="card">
                <div class="card-header">Properties (${client.properties?.length || 0})</div>
                <div class="card-body">
                    ${client.properties && client.properties.length > 0 ? client.properties.map((prop, i) => `
                        <div class="array-item">
                            <div class="array-item-header">
                                <span class="array-item-title">Property ${i + 1}: ${prop.usage || 'Unknown'}</span>
                            </div>
                            <div class="data-grid">
                                ${this.renderField('Location', this.formatAddress(prop.address))}
                                ${this.renderField('Type', prop.propertyType)}
                                ${this.renderField('Usage', prop.usage)}
                                ${this.renderField('Current Value', this.formatCurrency(prop.currentValue, prop.currency))}
                                ${this.renderField('Purchase Price', this.formatCurrency(prop.purchasePrice, prop.currency))}
                                ${this.renderField('Mortgage Balance', this.formatCurrency(prop.mortgageBalance, prop.currency))}
                                ${this.renderField('Monthly Payment', this.formatCurrency(prop.monthlyPayment, prop.currency))}
                                ${this.renderField('Equity', this.formatCurrency(prop.currentValue - prop.mortgageBalance, prop.currency))}
                            </div>
                        </div>
                    `).join('') : '<p class="empty-state">No properties recorded</p>'}
                </div>
            </div>

            <div class="card">
                <div class="card-header">Pensions (${client.pensions?.length || 0})</div>
                <div class="card-body">
                    ${client.pensions && client.pensions.length > 0 ? client.pensions.map((pension, i) => `
                        <div class="array-item">
                            <div class="array-item-header">
                                <span class="array-item-title">Pension ${i + 1}: ${pension.type || 'Unknown'}</span>
                            </div>
                            <div class="data-grid">
                                ${this.renderField('Provider', pension.provider)}
                                ${this.renderField('Type', pension.type)}
                                ${this.renderField('Current Value', this.formatCurrency(pension.currentValue, pension.currency))}
                                ${this.renderField('Annual Growth Rate', pension.annualGrowthRate ? `${pension.annualGrowthRate}%` : null)}
                                ${this.renderField('Employer Contribution', pension.employerContribution)}
                                ${this.renderField('Employee Contribution', pension.employeeContribution)}
                            </div>
                        </div>
                    `).join('') : '<p class="empty-state">No pensions recorded</p>'}
                </div>
            </div>

            <div class="card">
                <div class="card-header">Investments (${client.investments?.length || 0})</div>
                <div class="card-body">
                    ${client.investments && client.investments.length > 0 ? client.investments.map((inv, i) => `
                        <div class="array-item">
                            <div class="array-item-header">
                                <span class="array-item-title">Investment ${i + 1}: ${inv.type || 'Unknown'}</span>
                            </div>
                            <div class="data-grid">
                                ${this.renderField('Provider', inv.provider)}
                                ${this.renderField('Type', inv.type)}
                                ${this.renderField('Current Value', this.formatCurrency(inv.currentValue, inv.currency))}
                                ${this.renderField('Annual Return', inv.annualReturn ? `${inv.annualReturn}%` : null)}
                            </div>
                        </div>
                    `).join('') : '<p class="empty-state">No investments recorded</p>'}
                </div>
            </div>

            <div class="card">
                <div class="card-header">Bank Accounts (${client.bankAccounts?.length || 0})</div>
                <div class="card-body">
                    ${client.bankAccounts && client.bankAccounts.length > 0 ? client.bankAccounts.map((acc, i) => `
                        <div class="array-item">
                            <div class="array-item-header">
                                <span class="array-item-title">Account ${i + 1}: ${acc.bank || 'Unknown'}</span>
                            </div>
                            <div class="data-grid">
                                ${this.renderField('Bank', acc.bank)}
                                ${this.renderField('Type', acc.accountType)}
                                ${this.renderField('Balance', this.formatCurrency(acc.balance, acc.currency))}
                                ${this.renderField('Interest Rate', acc.interestRate ? `${acc.interestRate}%` : null)}
                            </div>
                        </div>
                    `).join('') : '<p class="empty-state">No bank accounts recorded</p>'}
                </div>
            </div>

            <div class="card">
                <div class="card-header">Debts/Liabilities (${client.debts?.length || 0})</div>
                <div class="card-body">
                    ${client.debts && client.debts.length > 0 ? client.debts.map((debt, i) => `
                        <div class="array-item">
                            <div class="array-item-header">
                                <span class="array-item-title">Debt ${i + 1}: ${debt.type || 'Unknown'}</span>
                            </div>
                            <div class="data-grid">
                                ${this.renderField('Provider', debt.provider)}
                                ${this.renderField('Type', debt.type)}
                                ${this.renderField('Outstanding', this.formatCurrency(debt.outstandingBalance, debt.currency))}
                                ${this.renderField('Monthly Payment', this.formatCurrency(debt.monthlyPayment, debt.currency))}
                            </div>
                        </div>
                    `).join('') : '<p class="empty-state">No debts recorded</p>'}
                </div>
            </div>
        `;
    },

    // Render goals tab
    renderGoalsTab: function(client) {
        return `
            <div class="card">
                <div class="card-header">Goals & Objectives</div>
                <div class="card-body">
                    <div class="data-grid">
                        ${this.renderField('Short Term (0-2 years)', client.goals.shortTerm)}
                        ${this.renderField('Medium Term (2-5 years)', client.goals.mediumTerm)}
                        ${this.renderField('Long Term (5+ years)', client.goals.longTerm)}
                        ${this.renderField('Target Retirement Age', client.goals.retirementAge)}
                        ${this.renderField('Retirement Income Required', this.formatCurrency(client.goals.retirementIncomeRequired, client.goals.retirementIncomeCurrency))}
                        ${this.renderField('Retirement Location', client.goals.retirementLocation)}
                        ${this.renderField('Concerns', client.goals.concerns)}
                        ${this.renderField('Priorities', client.goals.priorities)}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Risk Attitude</div>
                <div class="card-body">
                    <div class="data-grid">
                        ${this.renderField('Investment Experience', client.riskAttitude.investmentExperience)}
                        ${this.renderField('Risk Tolerance (1-5)', client.riskAttitude.riskTolerance)}
                        ${this.renderField('Capacity for Loss', client.riskAttitude.capacityForLoss)}
                        ${this.renderField('Investment Time Horizon', client.riskAttitude.investmentTimeHorizon)}
                        ${this.renderField('Ethical Investing', client.riskAttitude.attitudeToEthicalInvesting)}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Monthly Expenditure</div>
                <div class="card-body">
                    <div class="data-grid">
                        ${this.renderField('Mortgage/Rent', this.formatCurrency(client.expenditure.mortgage || client.expenditure.rent, client.expenditure.currency))}
                        ${this.renderField('Utilities', this.formatCurrency(client.expenditure.utilities, client.expenditure.currency))}
                        ${this.renderField('Food', this.formatCurrency(client.expenditure.food, client.expenditure.currency))}
                        ${this.renderField('Transport', this.formatCurrency(client.expenditure.transport, client.expenditure.currency))}
                        ${this.renderField('Insurance', this.formatCurrency(client.expenditure.insurance, client.expenditure.currency))}
                        ${this.renderField('Childcare', this.formatCurrency(client.expenditure.childcare, client.expenditure.currency))}
                        ${this.renderField('School Fees', this.formatCurrency(client.expenditure.schoolFees, client.expenditure.currency))}
                        ${this.renderField('Entertainment', this.formatCurrency(client.expenditure.entertainment, client.expenditure.currency))}
                        ${this.renderField('Total Monthly', this.formatCurrency(client.expenditure.totalMonthly, client.expenditure.currency))}
                    </div>
                </div>
            </div>
        `;
    },

    // Render upload tab
    renderUploadTab: function() {
        return `
            <div class="card">
                <div class="card-header">Upload Transcript</div>
                <div class="card-body">
                    <div class="upload-area" id="uploadArea">
                        <div class="upload-icon">📄</div>
                        <h3>Drop transcript file here</h3>
                        <p>or click to browse (.txt files)</p>
                    </div>
                    <input type="file" id="transcriptFile" accept=".txt" style="display: none;">

                    <div class="alert alert-info" style="margin-top: 20px;">
                        <strong>Tip:</strong> Upload meeting transcripts to automatically extract client data.
                        The AI will identify names, dates, financial information, and goals from the conversation.
                    </div>
                </div>
            </div>

            <div id="extractionReviewArea"></div>
        `;
    },

    // Attach upload tab listeners
    attachUploadListeners: function() {
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                document.getElementById('transcriptFile').click();
            });

            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleTranscriptUpload(files[0]);
                }
            });
        }

        document.getElementById('transcriptFile').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleTranscriptUpload(e.target.files[0]);
            }
        });
    },

    // Render settings tab
    renderSettingsTab: function() {
        const apiKey = Extraction.getApiKey() || '';
        return `
            <div class="card">
                <div class="card-header">API Settings</div>
                <div class="card-body">
                    <div class="form-group">
                        <label for="apiKey">Claude API Key</label>
                        <input type="password" id="apiKey" class="form-control"
                               placeholder="sk-ant-..."
                               value="${apiKey}">
                        <p style="margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">
                            Your API key is stored locally and never sent to any server except Anthropic's API.
                        </p>
                    </div>
                    <button class="btn btn-primary" id="btnSaveApiKey">Save API Key</button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">Data Management</div>
                <div class="card-body">
                    <p style="margin-bottom: 15px;">Export or import client data for backup purposes.</p>
                    <button class="btn btn-secondary" id="btnExportAllData">Export All Data</button>
                    <button class="btn btn-secondary" id="btnImportData" style="margin-left: 10px;">Import Data</button>
                    <input type="file" id="importDataFile" accept=".json" style="display: none;">
                </div>
            </div>
        `;
    },

    // Attach settings tab listeners
    attachSettingsListeners: function() {
        document.getElementById('btnSaveApiKey')?.addEventListener('click', () => {
            this.saveApiKey();
        });

        document.getElementById('btnExportAllData')?.addEventListener('click', () => {
            this.exportAllData();
        });

        document.getElementById('btnImportData')?.addEventListener('click', () => {
            document.getElementById('importDataFile').click();
        });

        document.getElementById('importDataFile')?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importData(e.target.files[0]);
            }
        });
    },

    // Handle adding a new client
    handleAddClient: async function() {
        const firstName = document.getElementById('newClientFirstName').value.trim();
        const lastName = document.getElementById('newClientLastName').value.trim();
        const email = document.getElementById('newClientEmail').value.trim();

        if (!firstName || !lastName) {
            this.showAlert('Please enter first and last name', 'warning');
            return;
        }

        try {
            // Create new client with schema
            const newClient = ClientSchema.createEmptyClient();
            newClient.personal.firstName = firstName;
            newClient.personal.lastName = lastName;
            newClient.personal.email = email;

            // Save to database
            await Database.saveClient(newClient);

            // Hide modal and reset form
            this.hideModal('addClientModal');
            document.getElementById('addClientForm').reset();

            // Reload client list
            await this.loadClientList();

            // Select the new client
            await this.selectClient(newClient.id);

            this.showAlert('Client added successfully', 'success');

        } catch (error) {
            console.error('Failed to add client:', error);
            this.showAlert('Failed to add client: ' + error.message, 'danger');
        }
    },

    // Handle transcript upload
    handleTranscriptUpload: async function(file) {
        if (!file.name.endsWith('.txt')) {
            this.showAlert('Please upload a .txt file', 'warning');
            return;
        }

        try {
            // Read file content
            const text = await this.readFileAsText(file);

            // Show processing state
            const reviewArea = document.getElementById('extractionReviewArea');
            reviewArea.innerHTML = `
                <div class="card">
                    <div class="card-body" style="text-align: center; padding: 40px;">
                        <div class="spinner" style="border-color: var(--primary-color); border-top-color: transparent; width: 40px; height: 40px; margin: 0 auto 20px;"></div>
                        <h3>Processing Transcript...</h3>
                        <p style="color: var(--text-secondary);">Extracting client data using AI</p>
                    </div>
                </div>
            `;

            // Save transcript
            const transcript = {
                clientId: this.currentClientId,
                fileName: file.name,
                content: text,
                uploadedAt: new Date().toISOString()
            };
            await Database.saveTranscript(transcript);

            // Extract data
            const extraction = await Extraction.extractFromTranscript(text, this.currentClient);

            if (!extraction.success) {
                throw new Error(extraction.error || 'Extraction failed');
            }

            // Store current extraction for approval
            this.currentExtraction = extraction;

            // Show review interface
            this.renderExtractionReview(extraction);

        } catch (error) {
            console.error('Transcript processing error:', error);
            this.showAlert('Failed to process transcript: ' + error.message, 'danger');
            document.getElementById('extractionReviewArea').innerHTML = '';
        }
    },

    // Render extraction review interface
    renderExtractionReview: function(extraction) {
        const reviewArea = document.getElementById('extractionReviewArea');

        // Find conflicts with existing data
        const conflicts = Extraction.findConflicts(this.currentClient, extraction.data);

        let html = '';

        // Demo mode notice
        if (extraction.isDemo) {
            html += `
                <div class="alert alert-warning">
                    <strong>Demo Mode:</strong> No API key configured. Showing sample extracted data.
                    Go to Settings to add your Claude API key for real extraction.
                </div>
            `;
        }

        // Summary
        html += `
            <div class="summary-card">
                <h4>Extraction Summary</h4>
                <p>${extraction.summary}</p>
            </div>
        `;

        // Missing fields
        if (extraction.missingFields && extraction.missingFields.length > 0) {
            html += `
                <div class="missing-fields">
                    <h4>Missing Information</h4>
                    <ul>
                        ${extraction.missingFields.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Conflicts
        if (conflicts.length > 0) {
            html += `
                <div class="alert alert-danger">
                    <strong>Conflicts Found:</strong> ${conflicts.length} field(s) have different values than existing data.
                    Review carefully before approving.
                </div>
            `;
        }

        // Extracted fields
        html += `
            <div class="card">
                <div class="card-header">
                    <span>Extracted Data</span>
                    <div>
                        <button class="btn btn-sm btn-secondary" onclick="App.selectAllFields()">Select All</button>
                        <button class="btn btn-sm btn-secondary" onclick="App.deselectAllFields()">Deselect All</button>
                    </div>
                </div>
                <div class="card-body">
                    <form id="extractionForm">
                        ${this.renderExtractionFields(extraction.data, '', conflicts)}
                    </form>
                </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" id="btnRejectExtraction">Cancel</button>
                <button class="btn btn-success" id="btnApproveExtraction">Approve & Save Selected</button>
            </div>
        `;

        reviewArea.innerHTML = html;

        // Attach listeners
        document.getElementById('btnApproveExtraction').addEventListener('click', () => {
            this.approveExtraction();
        });

        document.getElementById('btnRejectExtraction').addEventListener('click', () => {
            this.rejectExtraction();
        });
    },

    // Render extraction fields recursively
    renderExtractionFields: function(data, prefix = '', conflicts = []) {
        let html = '';

        const renderValue = (key, value, path) => {
            if (value === null || value.value === null) return '';

            const isConflict = conflicts.some(c => c.field === path);
            const confidence = value.confidence || 0;
            let confidenceClass = 'low';
            if (confidence >= 0.8) confidenceClass = 'high';
            else if (confidence >= 0.5) confidenceClass = 'medium';

            const displayValue = typeof value.value === 'object'
                ? JSON.stringify(value.value)
                : value.value;

            return `
                <div class="extraction-field">
                    <input type="checkbox" class="extraction-checkbox"
                           name="field_${path}" value="${path}" checked>
                    <div class="extraction-field-content">
                        <div class="extraction-field-name">
                            ${this.formatFieldName(key)}
                            ${isConflict ? '<span class="conflict-badge">CONFLICT</span>' : ''}
                        </div>
                        <div class="extraction-field-value">
                            <input type="text" value="${this.escapeHtml(String(displayValue))}"
                                   data-path="${path}" class="extracted-value-input">
                            <span class="confidence-badge confidence-${confidenceClass}">
                                ${Math.round(confidence * 100)}%
                            </span>
                        </div>
                        ${isConflict ? `
                            <div style="font-size: 0.75rem; color: var(--danger-color); margin-top: 4px;">
                                Existing: ${conflicts.find(c => c.field === path).existingValue}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        };

        for (const key in data) {
            const value = data[key];
            const path = prefix ? `${prefix}.${key}` : key;

            if (Array.isArray(value)) {
                // Handle arrays (children, pensions, etc.)
                if (value.length > 0) {
                    html += `<h4 class="section-header">${this.formatFieldName(key)}</h4>`;
                    value.forEach((item, index) => {
                        html += `<div class="array-item"><strong>${this.formatFieldName(key)} ${index + 1}</strong>`;
                        html += this.renderExtractionFields(item, `${path}[${index}]`, conflicts);
                        html += `</div>`;
                    });
                }
            } else if (value && typeof value === 'object') {
                if ('value' in value && 'confidence' in value) {
                    // This is a value-confidence pair
                    html += renderValue(key, value, path);
                } else {
                    // Nested object, add section header and recurse
                    const hasContent = Object.keys(value).some(k => {
                        const v = value[k];
                        return v && (('value' in v && v.value !== null) || typeof v === 'object');
                    });

                    if (hasContent) {
                        html += `<h4 class="section-header">${this.formatFieldName(key)}</h4>`;
                        html += this.renderExtractionFields(value, path, conflicts);
                    }
                }
            }
        }

        return html;
    },

    // Select all extraction fields
    selectAllFields: function() {
        document.querySelectorAll('.extraction-checkbox').forEach(cb => {
            cb.checked = true;
        });
    },

    // Deselect all extraction fields
    deselectAllFields: function() {
        document.querySelectorAll('.extraction-checkbox').forEach(cb => {
            cb.checked = false;
        });
    },

    // Approve extraction and merge data
    approveExtraction: async function() {
        if (!this.currentExtraction || !this.currentClient) {
            this.showAlert('No extraction to approve', 'warning');
            return;
        }

        try {
            // Get selected fields and their edited values
            const selectedFields = [];
            const editedValues = {};

            document.querySelectorAll('.extraction-checkbox:checked').forEach(cb => {
                const path = cb.value;
                selectedFields.push(path);

                // Get the edited value
                const input = document.querySelector(`input[data-path="${path}"]`);
                if (input) {
                    editedValues[path] = input.value;
                }
            });

            if (selectedFields.length === 0) {
                this.showAlert('Please select at least one field to save', 'warning');
                return;
            }

            // Clone the client
            let updatedClient = JSON.parse(JSON.stringify(this.currentClient));

            // Apply selected fields with edited values
            for (const path of selectedFields) {
                const value = editedValues[path];
                this.setNestedValue(updatedClient, path, value);
            }

            // Update metadata
            updatedClient.version = (updatedClient.version || 0) + 1;
            updatedClient.updatedAt = new Date().toISOString();
            updatedClient.dataSources = updatedClient.dataSources || [];
            updatedClient.dataSources.push({
                type: 'transcript',
                date: new Date().toISOString(),
                fieldsUpdated: selectedFields.length
            });

            // Recalculate completeness
            updatedClient.dataCompleteness = ClientSchema.calculateCompleteness(updatedClient);

            // Save to database
            await Database.saveClient(updatedClient);

            // Clear extraction state
            this.currentExtraction = null;

            // Reload client
            await this.selectClient(this.currentClientId);
            await this.loadClientList();

            this.showAlert(`Successfully updated ${selectedFields.length} field(s)`, 'success');

        } catch (error) {
            console.error('Failed to save extraction:', error);
            this.showAlert('Failed to save: ' + error.message, 'danger');
        }
    },

    // Reject extraction
    rejectExtraction: function() {
        this.currentExtraction = null;
        document.getElementById('extractionReviewArea').innerHTML = '';
        this.showAlert('Extraction cancelled', 'info');
    },

    // Set nested value using path
    setNestedValue: function(obj, path, value) {
        // Handle array notation like "pensions[0].currentValue"
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            const isIndex = /^\d+$/.test(parts[i + 1]);

            if (!(part in current)) {
                current[part] = isIndex ? [] : {};
            }
            current = current[part];
        }

        const lastPart = parts[parts.length - 1];

        // Try to parse as number if it looks like one
        if (value !== '' && !isNaN(value)) {
            value = parseFloat(value);
        } else if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        }

        current[lastPart] = value;
    },

    // Save API key
    saveApiKey: function() {
        const apiKey = document.getElementById('apiKey').value.trim();
        Extraction.setApiKey(apiKey);
        this.showAlert('API key saved', 'success');
    },

    // Delete current client
    deleteCurrentClient: async function() {
        if (!this.currentClientId) return;

        if (!confirm('Are you sure you want to delete this client? This cannot be undone.')) {
            return;
        }

        try {
            await Database.deleteClient(this.currentClientId);

            this.currentClientId = null;
            this.currentClient = null;

            await this.loadClientList();

            // Show welcome state
            this.showWelcome();

            this.showAlert('Client deleted', 'success');

        } catch (error) {
            console.error('Failed to delete client:', error);
            this.showAlert('Failed to delete client: ' + error.message, 'danger');
        }
    },

    // Export current client data
    exportClientData: async function() {
        if (!this.currentClient) return;

        const data = {
            exportDate: new Date().toISOString(),
            client: this.currentClient
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `client_${this.currentClient.personal.lastName || 'export'}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
    },

    // Export all data
    exportAllData: async function() {
        try {
            const data = await Database.exportAllData();

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `adviser_ai_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);

            this.showAlert('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showAlert('Export failed: ' + error.message, 'danger');
        }
    },

    // Import data
    importData: async function(file) {
        try {
            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);

            await Database.importData(data);
            await this.loadClientList();

            this.showAlert('Data imported successfully', 'success');
        } catch (error) {
            console.error('Import failed:', error);
            this.showAlert('Import failed: ' + error.message, 'danger');
        }
    },

    // Helper: Read file as text
    readFileAsText: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    },

    // Helper: Show modal
    showModal: function(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    // Helper: Hide modal
    hideModal: function(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    // Helper: Show alert
    showAlert: function(message, type = 'info') {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 2000; max-width: 400px; animation: slideIn 0.3s ease;';
        alert.textContent = message;

        document.body.appendChild(alert);

        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.3s';
            setTimeout(() => alert.remove(), 300);
        }, 3000);
    },

    // Helper: Escape HTML
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Helper: Get initials
    getInitials: function(name) {
        return name.split(' ')
            .filter(n => n)
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';
    },

    // Helper: Format field name
    formatFieldName: function(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/([0-9]+)/g, ' $1');
    },

    // Helper: Format currency
    formatCurrency: function(value, currency) {
        if (value === null || value === undefined || value === '') return null;

        const formatter = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });

        return `${currency || ''} ${formatter.format(value)}`.trim();
    },

    // Helper: Format address
    formatAddress: function(address) {
        if (!address) return null;

        const parts = [
            address.line1,
            address.line2,
            address.city,
            address.state,
            address.postcode,
            address.country
        ].filter(p => p);

        return parts.length > 0 ? parts.join(', ') : null;
    },

    // Show batch upload view
    showBatchUploadView: function() {
        this.currentClientId = null;
        this.currentClient = null;

        // Clear active state in sidebar
        document.querySelectorAll('.client-list-item').forEach(item => {
            item.classList.remove('active');
        });

        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="content-header">
                <h2>Batch Transcript Upload</h2>
            </div>
            <div class="content-body">
                <div class="card">
                    <div class="card-header">Mass Upload Transcripts</div>
                    <div class="card-body">
                        <div class="upload-area" id="batchUploadArea">
                            <div class="upload-icon">&#128218;</div>
                            <h3>Drop multiple transcript files here</h3>
                            <p>or click to browse (.txt files) - select multiple files</p>
                            <p style="margin-top: 10px; font-size: 0.8rem; color: var(--text-secondary);">
                                The AI will automatically identify clients, create records, and extract data from each transcript.
                            </p>
                        </div>

                        <div class="alert alert-info" style="margin-top: 20px;">
                            <strong>How it works:</strong>
                            <ul style="margin: 10px 0 0 20px; font-size: 0.875rem;">
                                <li>Upload multiple meeting transcript files at once</li>
                                <li>AI identifies the client in each transcript automatically</li>
                                <li>If a client already exists, you'll be asked to confirm before merging</li>
                                <li>New clients are created automatically with extracted data</li>
                                <li>Multiple meetings for the same client build up their profile over time</li>
                                <li>Export individual client files when processing is complete</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Attach upload listeners
        const batchUploadArea = document.getElementById('batchUploadArea');
        batchUploadArea.addEventListener('click', () => {
            document.getElementById('batchTranscriptFiles').click();
        });

        batchUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            batchUploadArea.classList.add('dragover');
        });

        batchUploadArea.addEventListener('dragleave', () => {
            batchUploadArea.classList.remove('dragover');
        });

        batchUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            batchUploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.txt'));
            if (files.length > 0) {
                BatchProcessor.startBatch(files);
            } else {
                this.showAlert('Please drop .txt transcript files', 'warning');
            }
        });
    },

    // Show welcome state
    showWelcome: async function() {
        this.currentClientId = null;
        this.currentClient = null;
        await this.loadClientList();

        document.getElementById('mainContent').innerHTML = `
            <div class="welcome-state">
                <h2>Welcome to Adviser AI</h2>
                <p>Select a client from the sidebar or add a new one to get started.</p>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-primary" onclick="App.showModal('addClientModal')">Add Client</button>
                    <button class="btn btn-secondary" onclick="App.showBatchUploadView()">Batch Upload Transcripts</button>
                </div>
            </div>
        `;
    },

    // Safe nested value getter
    getNestedValueSafe: function(obj, path) {
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }
        return current;
    },

    // Helper: Render a data field
    renderField: function(label, value) {
        const displayValue = value !== null && value !== undefined && value !== ''
            ? this.escapeHtml(String(value))
            : '<span class="empty">Not recorded</span>';

        return `
            <div class="data-field">
                <label>${label}</label>
                <div class="value ${!value ? 'empty' : ''}">${displayValue}</div>
            </div>
        `;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App available globally
if (typeof window !== 'undefined') {
    window.App = App;
}
