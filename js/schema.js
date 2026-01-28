/**
 * Adviser AI - Complete Client Data Schema
 * Based on TWI Fact-Find requirements
 * All fields are always present (empty string/null/[] if no data)
 */

const ClientSchema = {
    // Generate a new client with all fields initialized
    createEmptyClient: function(id = null) {
        return {
            // System fields
            id: id || Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dataCompleteness: 0,
            version: 1,

            // Data source tracking
            dataSources: [], // Array of { transcriptId, date, fieldsUpdated }

            // ========== PERSONAL DETAILS - CLIENT ==========
            personal: {
                title: '',
                firstName: '',
                middleName: '',
                lastName: '',
                preferredName: '',
                dateOfBirth: '',
                age: null,
                gender: '',
                countryOfResidence: '',
                nationality: '',
                dualNationality: '',
                nationalInsuranceNumber: '',
                taxResidency: '',
                taxIdentificationNumber: '',
                email: '',
                phoneHome: '',
                phoneMobile: '',
                phoneWork: '',
                address: {
                    line1: '',
                    line2: '',
                    city: '',
                    state: '',
                    postcode: '',
                    country: ''
                },
                relationshipStatus: '', // Single, Married, Divorced, Widowed, Separated, Cohabiting
                dateOfMarriage: '',
                isPoliticallyExposedPerson: null, // true/false/null
                pepDetails: '',
                healthStatus: '',
                smoker: null,
                willInPlace: null,
                willDate: '',
                powerOfAttorneyInPlace: null,
                notes: ''
            },

            // ========== PERSONAL DETAILS - SPOUSE/PARTNER ==========
            spouse: {
                title: '',
                firstName: '',
                middleName: '',
                lastName: '',
                preferredName: '',
                dateOfBirth: '',
                age: null,
                gender: '',
                countryOfResidence: '',
                nationality: '',
                dualNationality: '',
                nationalInsuranceNumber: '',
                taxResidency: '',
                taxIdentificationNumber: '',
                email: '',
                phoneHome: '',
                phoneMobile: '',
                phoneWork: '',
                address: {
                    line1: '',
                    line2: '',
                    city: '',
                    state: '',
                    postcode: '',
                    country: ''
                },
                isPoliticallyExposedPerson: null,
                pepDetails: '',
                healthStatus: '',
                smoker: null,
                willInPlace: null,
                willDate: '',
                powerOfAttorneyInPlace: null,
                notes: ''
            },

            // ========== EMPLOYMENT - CLIENT ==========
            employment: {
                status: '', // Employed, Self-Employed, Retired, Unemployed, Student
                jobTitle: '',
                employer: '',
                employerAddress: '',
                industry: '',
                yearsInRole: null,
                contractType: '', // Permanent, Fixed-term, Contractor
                contractEndDate: '',
                monthlyGrossIncome: null,
                monthlyNetIncome: null,
                incomeCurrency: '',
                annualBonus: null,
                bonusGuaranteed: null,
                otherBenefits: '',
                monthlySurplus: null,
                anticipatedChanges: '',
                retirementAge: null,
                notes: ''
            },

            // ========== EMPLOYMENT - SPOUSE ==========
            spouseEmployment: {
                status: '',
                jobTitle: '',
                employer: '',
                employerAddress: '',
                industry: '',
                yearsInRole: null,
                contractType: '',
                contractEndDate: '',
                monthlyGrossIncome: null,
                monthlyNetIncome: null,
                incomeCurrency: '',
                annualBonus: null,
                bonusGuaranteed: null,
                otherBenefits: '',
                monthlySurplus: null,
                anticipatedChanges: '',
                retirementAge: null,
                notes: ''
            },

            // ========== CHILDREN/DEPENDANTS ==========
            children: [], // Array of child objects - use createEmptyChild()

            // ========== PENSIONS ==========
            pensions: [], // Array of pension objects - use createEmptyPension()

            // ========== PROPERTIES ==========
            properties: [], // Array of property objects - use createEmptyProperty()

            // ========== INVESTMENTS ==========
            investments: [], // Array of investment objects - use createEmptyInvestment()

            // ========== BANK ACCOUNTS ==========
            bankAccounts: [], // Array of bank account objects - use createEmptyBankAccount()

            // ========== DEBTS/LIABILITIES ==========
            debts: [], // Array of debt objects - use createEmptyDebt()

            // ========== PROTECTION/INSURANCE ==========
            protection: [], // Array of protection objects - use createEmptyProtection()

            // ========== GOALS & OBJECTIVES ==========
            goals: {
                shortTerm: '', // 0-2 years
                mediumTerm: '', // 2-5 years
                longTerm: '', // 5+ years
                retirementAge: null,
                retirementIncomeRequired: null,
                retirementIncomeCurrency: '',
                retirementLocation: '',
                financialGoals: [],
                concerns: '',
                priorities: '',
                notes: ''
            },

            // ========== RISK ATTITUDE ==========
            riskAttitude: {
                investmentExperience: '', // None, Limited, Moderate, Extensive
                riskTolerance: null, // 1-5 scale (1=Very Cautious, 5=Adventurous)
                capacityForLoss: '', // Low, Medium, High
                investmentTimeHorizon: '', // Short (<3yrs), Medium (3-7yrs), Long (7+yrs)
                attitudeToEthicalInvesting: '',
                previousInvestmentExperience: '',
                reactionToMarketFall: '',
                notes: ''
            },

            // ========== MONTHLY EXPENDITURE ==========
            expenditure: {
                mortgage: null,
                rent: null,
                councilTax: null,
                utilities: null,
                insurance: null,
                food: null,
                transport: null,
                childcare: null,
                schoolFees: null,
                entertainment: null,
                holidays: null,
                clothing: null,
                loans: null,
                creditCards: null,
                savings: null,
                other: null,
                otherDetails: '',
                totalMonthly: null,
                currency: '',
                notes: ''
            },

            // ========== ESTATE PLANNING ==========
            estatePlanning: {
                willInPlace: null,
                willDate: '',
                willLocation: '',
                executors: '',
                powerOfAttorney: null,
                poaType: '',
                poaAttorneys: '',
                trustsInPlace: null,
                trustDetails: '',
                inheritanceTaxPlanning: '',
                giftsMade: '',
                notes: ''
            },

            // ========== VERSION HISTORY ==========
            history: [] // Array of { date, changes, source }
        };
    },

    // Create empty child object
    createEmptyChild: function() {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            age: null,
            gender: '',
            relationship: '', // Son, Daughter, Stepson, Stepdaughter, etc.
            isDependent: null,
            inEducation: null,
            school: '',
            annualSchoolFees: null,
            schoolFeesCurrency: '',
            healthIssues: '',
            notes: ''
        };
    },

    // Create empty pension object
    createEmptyPension: function() {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            owner: '', // Client, Spouse
            provider: '',
            policyNumber: '',
            type: '', // Defined Benefit, Defined Contribution, SIPP, QROPS, etc.
            currentValue: null,
            currency: '',
            employerContribution: null,
            employeeContribution: null,
            contributionFrequency: '',
            projectedValueAtRetirement: null,
            retirementAge: null,
            deathBenefits: '',
            transferValue: null,
            annualGrowthRate: null,
            charges: '',
            notes: ''
        };
    },

    // Create empty property object
    createEmptyProperty: function() {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            owner: '', // Client, Spouse, Joint
            address: {
                line1: '',
                line2: '',
                city: '',
                state: '',
                postcode: '',
                country: ''
            },
            propertyType: '', // House, Apartment, Land, Commercial
            usage: '', // Primary Residence, Investment, Holiday Home
            purchaseDate: '',
            purchasePrice: null,
            currentValue: null,
            currency: '',
            valuationDate: '',
            mortgageProvider: '',
            mortgageBalance: null,
            mortgageType: '', // Repayment, Interest Only
            mortgageRate: null,
            mortgageRateType: '', // Fixed, Variable
            mortgageEndDate: '',
            monthlyPayment: null,
            rentalIncome: null,
            rentalIncomeFrequency: '',
            equity: null,
            notes: ''
        };
    },

    // Create empty investment object
    createEmptyInvestment: function() {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            owner: '', // Client, Spouse, Joint
            provider: '',
            accountNumber: '',
            type: '', // ISA, GIA, Bond, Stocks, Funds, etc.
            platform: '',
            currentValue: null,
            currency: '',
            originalInvestment: null,
            investmentDate: '',
            annualReturn: null,
            regularContribution: null,
            contributionFrequency: '',
            taxWrapper: '',
            riskLevel: '',
            maturityDate: '',
            charges: '',
            notes: ''
        };
    },

    // Create empty bank account object
    createEmptyBankAccount: function() {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            owner: '', // Client, Spouse, Joint
            bank: '',
            accountType: '', // Current, Savings, Fixed Deposit
            accountNumber: '',
            sortCode: '',
            balance: null,
            currency: '',
            interestRate: null,
            monthlyIncome: null,
            purpose: '',
            notes: ''
        };
    },

    // Create empty debt object
    createEmptyDebt: function() {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            owner: '', // Client, Spouse, Joint
            type: '', // Personal Loan, Credit Card, Car Finance, Student Loan, Other
            provider: '',
            originalAmount: null,
            outstandingBalance: null,
            currency: '',
            interestRate: null,
            monthlyPayment: null,
            startDate: '',
            endDate: '',
            secured: null,
            notes: ''
        };
    },

    // Create empty protection/insurance object
    createEmptyProtection: function() {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            owner: '', // Client, Spouse
            type: '', // Life, Critical Illness, Income Protection, Health, etc.
            provider: '',
            policyNumber: '',
            sumAssured: null,
            currency: '',
            premium: null,
            premiumFrequency: '',
            startDate: '',
            endDate: '',
            inTrust: null,
            beneficiaries: '',
            notes: ''
        };
    },

    // Calculate data completeness percentage
    calculateCompleteness: function(client) {
        const weights = {
            personal: 25,
            employment: 15,
            goals: 15,
            riskAttitude: 10,
            pensions: 10,
            properties: 10,
            investments: 5,
            bankAccounts: 5,
            expenditure: 5
        };

        let totalScore = 0;

        // Personal completeness
        const personalFields = ['firstName', 'lastName', 'dateOfBirth', 'email', 'phoneMobile',
                                'countryOfResidence', 'nationality', 'relationshipStatus'];
        const personalFilled = personalFields.filter(f => client.personal[f]).length;
        totalScore += (personalFilled / personalFields.length) * weights.personal;

        // Employment completeness
        const empFields = ['status', 'jobTitle', 'employer', 'monthlyGrossIncome', 'retirementAge'];
        const empFilled = empFields.filter(f => client.employment[f]).length;
        totalScore += (empFilled / empFields.length) * weights.employment;

        // Goals completeness
        const goalFields = ['shortTerm', 'longTerm', 'retirementAge'];
        const goalFilled = goalFields.filter(f => client.goals[f]).length;
        totalScore += (goalFilled / goalFields.length) * weights.goals;

        // Risk attitude completeness
        const riskFields = ['riskTolerance', 'investmentTimeHorizon', 'capacityForLoss'];
        const riskFilled = riskFields.filter(f => client.riskAttitude[f]).length;
        totalScore += (riskFilled / riskFields.length) * weights.riskAttitude;

        // Pensions - bonus if any exist
        if (client.pensions.length > 0) {
            totalScore += weights.pensions;
        }

        // Properties - bonus if any exist
        if (client.properties.length > 0) {
            totalScore += weights.properties;
        }

        // Investments - bonus if any exist
        if (client.investments.length > 0) {
            totalScore += weights.investments;
        }

        // Bank accounts - bonus if any exist
        if (client.bankAccounts.length > 0) {
            totalScore += weights.bankAccounts;
        }

        // Expenditure - check if any values filled
        const expFields = Object.keys(client.expenditure).filter(k => k !== 'notes' && k !== 'currency' && k !== 'otherDetails');
        const expFilled = expFields.filter(f => client.expenditure[f] !== null && client.expenditure[f] !== '').length;
        if (expFilled > 3) {
            totalScore += weights.expenditure;
        }

        return Math.round(totalScore);
    },

    // Validate client data
    validateClient: function(client) {
        const errors = [];

        if (!client.personal.firstName) {
            errors.push('First name is required');
        }
        if (!client.personal.lastName) {
            errors.push('Last name is required');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.ClientSchema = ClientSchema;
}
