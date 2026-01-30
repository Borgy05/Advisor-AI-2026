/**
 * Adviser AI - Factfind Field Mapping
 *
 * Maps client database fields to TWI Factfind Word template cells.
 *
 * TERMINOLOGY:
 * - "Database field" = a data point in the client JSON (e.g. personal.firstName)
 * - "Factfind cell"  = a table cell in the Word template (identified by table index, row, column)
 *
 * Each mapping entry:
 *   table:    Table index in the Word document (0-18)
 *   row:      Row index within that table
 *   col:      Column index within that row
 *   field:    Dot-notation path into the client object
 *   label:    Human-readable label for the mapping document
 *   format:   Optional formatting function name
 */

const FactfindMapping = {

    // =========================================================================
    // TABLE 0: Personal Details (Client & Spouse)
    // 14 rows x 13 cols — Client fills cols 1-6, Spouse fills cols 7-12
    // =========================================================================
    personalDetails: [
        // Client
        { table: 0, row: 1,  col: 1,  field: 'personal.firstName',           label: 'Client First Name' },
        { table: 0, row: 1,  col: 3,  field: 'personal.lastName',            label: 'Client Last Name' },
        { table: 0, row: 2,  col: 1,  field: 'personal.dob',                 label: 'Client DOB', format: 'date' },
        { table: 0, row: 2,  col: 4,  field: 'personal.age',                 label: 'Client Age' },
        { table: 0, row: 3,  col: 1,  field: 'personal.countryOfResidence',  label: 'Client Country of Residence' },
        { table: 0, row: 4,  col: 1,  field: 'personal.nationality',         label: 'Client Nationality' },
        { table: 0, row: 5,  col: 1,  field: 'personal.dualNationality',     label: 'Client Dual Nationality' },
        { table: 0, row: 8,  col: 1,  field: 'personal.email',               label: 'Client Email' },
        { table: 0, row: 9,  col: 1,  field: 'personal.phoneHome',           label: 'Client Phone (Home)' },
        { table: 0, row: 10, col: 1,  field: 'personal.phoneMobile',         label: 'Client Phone (Mobile)' },
        { table: 0, row: 12, col: 1,  field: 'personal.address.line1',       label: 'Client Address' },

        // Spouse/Partner
        { table: 0, row: 1,  col: 7,  field: 'spouse.firstName',             label: 'Spouse First Name' },
        { table: 0, row: 1,  col: 9,  field: 'spouse.lastName',              label: 'Spouse Last Name' },
        { table: 0, row: 2,  col: 7,  field: 'spouse.dob',                   label: 'Spouse DOB', format: 'date' },
        { table: 0, row: 2,  col: 10, field: 'spouse.age',                   label: 'Spouse Age' },
        { table: 0, row: 3,  col: 7,  field: 'spouse.countryOfResidence',    label: 'Spouse Country of Residence' },
        { table: 0, row: 4,  col: 7,  field: 'spouse.nationality',           label: 'Spouse Nationality' },
        { table: 0, row: 5,  col: 7,  field: 'spouse.dualNationality',       label: 'Spouse Dual Nationality' },
        { table: 0, row: 8,  col: 7,  field: 'spouse.email',                 label: 'Spouse Email' },
        { table: 0, row: 9,  col: 7,  field: 'spouse.phoneHome',             label: 'Spouse Phone (Home)' },
        { table: 0, row: 10, col: 7,  field: 'spouse.phoneMobile',           label: 'Spouse Phone (Mobile)' },
        { table: 0, row: 12, col: 7,  field: 'spouse.address.line1',         label: 'Spouse Address' },

        // Relationship status checkboxes (row 11)
        // Single=col1, Married=col3, Civil Partner=col5, Divorced=col9, Widowed=col11
        { table: 0, row: 11, col: 1,  field: 'personal.relationshipStatus',  label: 'Relationship Status', format: 'checkboxSingle' },
        { table: 0, row: 11, col: 3,  field: 'personal.relationshipStatus',  label: 'Relationship Status', format: 'checkboxMarried' },
        { table: 0, row: 11, col: 6,  field: 'personal.relationshipStatus',  label: 'Relationship Status', format: 'checkboxCivilPartner' },
        { table: 0, row: 11, col: 9,  field: 'personal.relationshipStatus',  label: 'Relationship Status', format: 'checkboxDivorced' },
        { table: 0, row: 11, col: 11, field: 'personal.relationshipStatus',  label: 'Relationship Status', format: 'checkboxWidowed' },
    ],

    // =========================================================================
    // TABLE 3: Employment Information
    // 13 rows x 11 cols
    // =========================================================================
    employment: [
        // Client employment (left side)
        { table: 3, row: 2,  col: 0,  field: 'employment.client.jobTitle',           label: 'Client Job Title' },
        { table: 3, row: 2,  col: 4,  field: 'employment.client.employer',           label: 'Client Employer' },
        { table: 3, row: 4,  col: 0,  field: 'employment.client.monthlyGrossIncome', label: 'Client Monthly Income', format: 'currency' },
        { table: 3, row: 4,  col: 4,  field: 'employment.client.monthlySurplus',     label: 'Client Monthly Surplus', format: 'currency' },
        { table: 3, row: 6,  col: 4,  field: 'employment.client.annualBonus',        label: 'Client Bonus Amount', format: 'currency' },
        { table: 3, row: 8,  col: 0,  field: 'employment.client.employmentHistory',  label: 'Client Employment History' },

        // Spouse employment (right side)
        { table: 3, row: 2,  col: 7,  field: 'employment.spouse.jobTitle',           label: 'Spouse Job Title' },
        { table: 3, row: 2,  col: 8,  field: 'employment.spouse.employer',           label: 'Spouse Employer' },
        { table: 3, row: 4,  col: 7,  field: 'employment.spouse.monthlyGrossIncome', label: 'Spouse Monthly Income', format: 'currency' },
        { table: 3, row: 4,  col: 8,  field: 'employment.spouse.monthlySurplus',     label: 'Spouse Monthly Surplus', format: 'currency' },
        { table: 3, row: 6,  col: 8,  field: 'employment.spouse.annualBonus',        label: 'Spouse Bonus Amount', format: 'currency' },
    ],

    // =========================================================================
    // TABLE 4: Children / Dependants
    // 8 rows x 9 cols — Up to 5 children (rows 2-6)
    // =========================================================================
    children: [
        // Child 1
        { table: 4, row: 2, col: 0, field: 'children[0].firstName',       label: 'Child 1 Name', format: 'childName' },
        { table: 4, row: 2, col: 1, field: 'children[0].dob',             label: 'Child 1 DOB', format: 'date' },
        { table: 4, row: 2, col: 2, field: 'children[0].age',             label: 'Child 1 Age' },
        { table: 4, row: 2, col: 3, field: 'children[0].school',          label: 'Child 1 School' },
        { table: 4, row: 2, col: 7, field: 'children[0].annualSchoolFees', label: 'Child 1 Annual Fees', format: 'currency' },
        // Child 2
        { table: 4, row: 3, col: 0, field: 'children[1].firstName',       label: 'Child 2 Name', format: 'childName' },
        { table: 4, row: 3, col: 1, field: 'children[1].dob',             label: 'Child 2 DOB', format: 'date' },
        { table: 4, row: 3, col: 2, field: 'children[1].age',             label: 'Child 2 Age' },
        { table: 4, row: 3, col: 3, field: 'children[1].school',          label: 'Child 2 School' },
        { table: 4, row: 3, col: 7, field: 'children[1].annualSchoolFees', label: 'Child 2 Annual Fees', format: 'currency' },
        // Child 3
        { table: 4, row: 4, col: 0, field: 'children[2].firstName',       label: 'Child 3 Name', format: 'childName' },
        { table: 4, row: 4, col: 1, field: 'children[2].dob',             label: 'Child 3 DOB', format: 'date' },
        { table: 4, row: 4, col: 2, field: 'children[2].age',             label: 'Child 3 Age' },
        { table: 4, row: 4, col: 3, field: 'children[2].school',          label: 'Child 3 School' },
        { table: 4, row: 4, col: 7, field: 'children[2].annualSchoolFees', label: 'Child 3 Annual Fees', format: 'currency' },
        // Child 4
        { table: 4, row: 5, col: 0, field: 'children[3].firstName',       label: 'Child 4 Name', format: 'childName' },
        { table: 4, row: 5, col: 1, field: 'children[3].dob',             label: 'Child 4 DOB', format: 'date' },
        { table: 4, row: 5, col: 2, field: 'children[3].age',             label: 'Child 4 Age' },
        { table: 4, row: 5, col: 3, field: 'children[3].school',          label: 'Child 4 School' },
        { table: 4, row: 5, col: 7, field: 'children[3].annualSchoolFees', label: 'Child 4 Annual Fees', format: 'currency' },
        // Child 5
        { table: 4, row: 6, col: 0, field: 'children[4].firstName',       label: 'Child 5 Name', format: 'childName' },
        { table: 4, row: 6, col: 1, field: 'children[4].dob',             label: 'Child 5 DOB', format: 'date' },
        { table: 4, row: 6, col: 2, field: 'children[4].age',             label: 'Child 5 Age' },
        { table: 4, row: 6, col: 3, field: 'children[4].school',          label: 'Child 5 School' },
        { table: 4, row: 6, col: 7, field: 'children[4].annualSchoolFees', label: 'Child 5 Annual Fees', format: 'currency' },
    ],

    // =========================================================================
    // TABLE 5: Protection / Insurance
    // 8 rows x 13 cols — Up to 3 policies (rows 2-4)
    // =========================================================================
    protection: [
        // Policy 1
        { table: 5, row: 2, col: 0,  field: 'protection[0].provider',    label: 'Protection 1 Provider' },
        { table: 5, row: 2, col: 5,  field: 'protection[0].type',        label: 'Protection 1 Type' },
        { table: 5, row: 2, col: 6,  field: 'protection[0].premium',     label: 'Protection 1 Premium', format: 'currency' },
        { table: 5, row: 2, col: 9,  field: 'protection[0].term',        label: 'Protection 1 Term' },
        { table: 5, row: 2, col: 12, field: 'protection[0].sumAssured',  label: 'Protection 1 Cover Amount', format: 'currency' },
        // Policy 2
        { table: 5, row: 3, col: 0,  field: 'protection[1].provider',    label: 'Protection 2 Provider' },
        { table: 5, row: 3, col: 5,  field: 'protection[1].type',        label: 'Protection 2 Type' },
        { table: 5, row: 3, col: 6,  field: 'protection[1].premium',     label: 'Protection 2 Premium', format: 'currency' },
        { table: 5, row: 3, col: 9,  field: 'protection[1].term',        label: 'Protection 2 Term' },
        { table: 5, row: 3, col: 12, field: 'protection[1].sumAssured',  label: 'Protection 2 Cover Amount', format: 'currency' },
        // Policy 3
        { table: 5, row: 4, col: 0,  field: 'protection[2].provider',    label: 'Protection 3 Provider' },
        { table: 5, row: 4, col: 5,  field: 'protection[2].type',        label: 'Protection 3 Type' },
        { table: 5, row: 4, col: 6,  field: 'protection[2].premium',     label: 'Protection 3 Premium', format: 'currency' },
        { table: 5, row: 4, col: 9,  field: 'protection[2].term',        label: 'Protection 3 Term' },
        { table: 5, row: 4, col: 12, field: 'protection[2].sumAssured',  label: 'Protection 3 Cover Amount', format: 'currency' },

        // Health & Will (rows 5-7)
        { table: 5, row: 5, col: 11, field: 'personal.healthDetails',    label: 'Client Health Details' },
        { table: 5, row: 6, col: 11, field: 'spouse.healthDetails',      label: 'Spouse Health Details' },
    ],

    // =========================================================================
    // TABLE 7: Bank Accounts
    // 8 rows x 4 cols — Up to 6 accounts (rows 2-7)
    // =========================================================================
    bankAccounts: [
        { table: 7, row: 2, col: 0, field: 'bankAccounts[0].bank',         label: 'Bank 1 Name' },
        { table: 7, row: 2, col: 1, field: 'bankAccounts[0].balance',      label: 'Bank 1 Value', format: 'currency' },
        { table: 7, row: 2, col: 2, field: 'bankAccounts[0].currency',     label: 'Bank 1 Currency' },
        { table: 7, row: 2, col: 3, field: 'bankAccounts[0].interestRate', label: 'Bank 1 Interest' },

        { table: 7, row: 3, col: 0, field: 'bankAccounts[1].bank',         label: 'Bank 2 Name' },
        { table: 7, row: 3, col: 1, field: 'bankAccounts[1].balance',      label: 'Bank 2 Value', format: 'currency' },
        { table: 7, row: 3, col: 2, field: 'bankAccounts[1].currency',     label: 'Bank 2 Currency' },
        { table: 7, row: 3, col: 3, field: 'bankAccounts[1].interestRate', label: 'Bank 2 Interest' },

        { table: 7, row: 4, col: 0, field: 'bankAccounts[2].bank',         label: 'Bank 3 Name' },
        { table: 7, row: 4, col: 1, field: 'bankAccounts[2].balance',      label: 'Bank 3 Value', format: 'currency' },
        { table: 7, row: 4, col: 2, field: 'bankAccounts[2].currency',     label: 'Bank 3 Currency' },
        { table: 7, row: 4, col: 3, field: 'bankAccounts[2].interestRate', label: 'Bank 3 Interest' },

        { table: 7, row: 5, col: 0, field: 'bankAccounts[3].bank',         label: 'Bank 4 Name' },
        { table: 7, row: 5, col: 1, field: 'bankAccounts[3].balance',      label: 'Bank 4 Value', format: 'currency' },
        { table: 7, row: 5, col: 2, field: 'bankAccounts[3].currency',     label: 'Bank 4 Currency' },
        { table: 7, row: 5, col: 3, field: 'bankAccounts[3].interestRate', label: 'Bank 4 Interest' },

        { table: 7, row: 6, col: 0, field: 'bankAccounts[4].bank',         label: 'Bank 5 Name' },
        { table: 7, row: 6, col: 1, field: 'bankAccounts[4].balance',      label: 'Bank 5 Value', format: 'currency' },
        { table: 7, row: 6, col: 2, field: 'bankAccounts[4].currency',     label: 'Bank 5 Currency' },
        { table: 7, row: 6, col: 3, field: 'bankAccounts[4].interestRate', label: 'Bank 5 Interest' },

        { table: 7, row: 7, col: 0, field: 'bankAccounts[5].bank',         label: 'Bank 6 Name' },
        { table: 7, row: 7, col: 1, field: 'bankAccounts[5].balance',      label: 'Bank 6 Value', format: 'currency' },
        { table: 7, row: 7, col: 2, field: 'bankAccounts[5].currency',     label: 'Bank 6 Currency' },
        { table: 7, row: 7, col: 3, field: 'bankAccounts[5].interestRate', label: 'Bank 6 Interest' },
    ],

    // =========================================================================
    // TABLE 8: Investments
    // 8 rows x 4 cols — Up to 6 investments (rows 2-7)
    // =========================================================================
    investments: [
        { table: 8, row: 2, col: 0, field: 'investments[0].provider',     label: 'Investment 1 Provider' },
        { table: 8, row: 2, col: 1, field: 'investments[0].currentValue', label: 'Investment 1 Value', format: 'currency' },
        { table: 8, row: 2, col: 2, field: 'investments[0].annualReturn', label: 'Investment 1 Return' },
        { table: 8, row: 2, col: 3, field: 'investments[0].type',         label: 'Investment 1 Info' },

        { table: 8, row: 3, col: 0, field: 'investments[1].provider',     label: 'Investment 2 Provider' },
        { table: 8, row: 3, col: 1, field: 'investments[1].currentValue', label: 'Investment 2 Value', format: 'currency' },
        { table: 8, row: 3, col: 2, field: 'investments[1].annualReturn', label: 'Investment 2 Return' },
        { table: 8, row: 3, col: 3, field: 'investments[1].type',         label: 'Investment 2 Info' },

        { table: 8, row: 4, col: 0, field: 'investments[2].provider',     label: 'Investment 3 Provider' },
        { table: 8, row: 4, col: 1, field: 'investments[2].currentValue', label: 'Investment 3 Value', format: 'currency' },
        { table: 8, row: 4, col: 2, field: 'investments[2].annualReturn', label: 'Investment 3 Return' },
        { table: 8, row: 4, col: 3, field: 'investments[2].type',         label: 'Investment 3 Info' },

        { table: 8, row: 5, col: 0, field: 'investments[3].provider',     label: 'Investment 4 Provider' },
        { table: 8, row: 5, col: 1, field: 'investments[3].currentValue', label: 'Investment 4 Value', format: 'currency' },
        { table: 8, row: 5, col: 2, field: 'investments[3].annualReturn', label: 'Investment 4 Return' },
        { table: 8, row: 5, col: 3, field: 'investments[3].type',         label: 'Investment 4 Info' },

        { table: 8, row: 6, col: 0, field: 'investments[4].provider',     label: 'Investment 5 Provider' },
        { table: 8, row: 6, col: 1, field: 'investments[4].currentValue', label: 'Investment 5 Value', format: 'currency' },
        { table: 8, row: 6, col: 2, field: 'investments[4].annualReturn', label: 'Investment 5 Return' },
        { table: 8, row: 6, col: 3, field: 'investments[4].type',         label: 'Investment 5 Info' },

        { table: 8, row: 7, col: 0, field: 'investments[5].provider',     label: 'Investment 6 Provider' },
        { table: 8, row: 7, col: 1, field: 'investments[5].currentValue', label: 'Investment 6 Value', format: 'currency' },
        { table: 8, row: 7, col: 2, field: 'investments[5].annualReturn', label: 'Investment 6 Return' },
        { table: 8, row: 7, col: 3, field: 'investments[5].type',         label: 'Investment 6 Info' },
    ],

    // =========================================================================
    // TABLE 9: Pensions
    // 8 rows x 4 cols — Up to 6 pensions (rows 2-7)
    // =========================================================================
    pensions: [
        { table: 9, row: 2, col: 0, field: 'pensions[0].provider',     label: 'Pension 1 Provider' },
        { table: 9, row: 2, col: 1, field: 'pensions[0].currentValue', label: 'Pension 1 Value', format: 'currency' },
        { table: 9, row: 2, col: 2, field: 'pensions[0].type',         label: 'Pension 1 Type' },
        { table: 9, row: 2, col: 3, field: 'pensions[0].notes',        label: 'Pension 1 Info' },

        { table: 9, row: 3, col: 0, field: 'pensions[1].provider',     label: 'Pension 2 Provider' },
        { table: 9, row: 3, col: 1, field: 'pensions[1].currentValue', label: 'Pension 2 Value', format: 'currency' },
        { table: 9, row: 3, col: 2, field: 'pensions[1].type',         label: 'Pension 2 Type' },
        { table: 9, row: 3, col: 3, field: 'pensions[1].notes',        label: 'Pension 2 Info' },

        { table: 9, row: 4, col: 0, field: 'pensions[2].provider',     label: 'Pension 3 Provider' },
        { table: 9, row: 4, col: 1, field: 'pensions[2].currentValue', label: 'Pension 3 Value', format: 'currency' },
        { table: 9, row: 4, col: 2, field: 'pensions[2].type',         label: 'Pension 3 Type' },
        { table: 9, row: 4, col: 3, field: 'pensions[2].notes',        label: 'Pension 3 Info' },

        { table: 9, row: 5, col: 0, field: 'pensions[3].provider',     label: 'Pension 4 Provider' },
        { table: 9, row: 5, col: 1, field: 'pensions[3].currentValue', label: 'Pension 4 Value', format: 'currency' },
        { table: 9, row: 5, col: 2, field: 'pensions[3].type',         label: 'Pension 4 Type' },
        { table: 9, row: 5, col: 3, field: 'pensions[3].notes',        label: 'Pension 4 Info' },

        { table: 9, row: 6, col: 0, field: 'pensions[4].provider',     label: 'Pension 5 Provider' },
        { table: 9, row: 6, col: 1, field: 'pensions[4].currentValue', label: 'Pension 5 Value', format: 'currency' },
        { table: 9, row: 6, col: 2, field: 'pensions[4].type',         label: 'Pension 5 Type' },
        { table: 9, row: 6, col: 3, field: 'pensions[4].notes',        label: 'Pension 5 Info' },

        { table: 9, row: 7, col: 0, field: 'pensions[5].provider',     label: 'Pension 6 Provider' },
        { table: 9, row: 7, col: 1, field: 'pensions[5].currentValue', label: 'Pension 6 Value', format: 'currency' },
        { table: 9, row: 7, col: 2, field: 'pensions[5].type',         label: 'Pension 6 Type' },
        { table: 9, row: 7, col: 3, field: 'pensions[5].notes',        label: 'Pension 6 Info' },
    ],

    // =========================================================================
    // TABLES 10-14: Properties (1-5)
    // Each property table: 4-5 rows x 6 cols
    // =========================================================================
    properties: [
        // Property 1 (Table 10)
        { table: 10, row: 1, col: 0, field: 'properties[0].address',           label: 'Property 1 Location' },
        { table: 10, row: 1, col: 2, field: 'properties[0].purchasePrice',     label: 'Property 1 Price Paid', format: 'currency' },
        { table: 10, row: 1, col: 3, field: 'properties[0].currentValue',      label: 'Property 1 Current Value', format: 'currency' },
        { table: 10, row: 1, col: 4, field: 'properties[0].purchaseDate',      label: 'Property 1 Purchase Date', format: 'date' },
        { table: 10, row: 1, col: 5, field: 'properties[0].mortgageBalance',   label: 'Property 1 Outstanding Mortgage', format: 'currency' },
        { table: 10, row: 3, col: 0, field: 'properties[0].monthlyPayment',    label: 'Property 1 Repayments', format: 'currency' },
        { table: 10, row: 3, col: 1, field: 'properties[0].rentalIncome',      label: 'Property 1 Rental Income', format: 'currency' },
        { table: 10, row: 3, col: 4, field: 'properties[0].mortgageRate',      label: 'Property 1 Interest Rate' },

        // Property 2 (Table 11)
        { table: 11, row: 0, col: 0, field: 'properties[1].address',           label: 'Property 2 Location' },
        { table: 11, row: 0, col: 2, field: 'properties[1].purchasePrice',     label: 'Property 2 Price Paid', format: 'currency' },
        { table: 11, row: 0, col: 3, field: 'properties[1].currentValue',      label: 'Property 2 Current Value', format: 'currency' },
        { table: 11, row: 0, col: 4, field: 'properties[1].purchaseDate',      label: 'Property 2 Purchase Date', format: 'date' },
        { table: 11, row: 0, col: 5, field: 'properties[1].mortgageBalance',   label: 'Property 2 Outstanding Mortgage', format: 'currency' },
        { table: 11, row: 2, col: 0, field: 'properties[1].monthlyPayment',    label: 'Property 2 Repayments', format: 'currency' },
        { table: 11, row: 2, col: 1, field: 'properties[1].rentalIncome',      label: 'Property 2 Rental Income', format: 'currency' },
        { table: 11, row: 2, col: 4, field: 'properties[1].mortgageRate',      label: 'Property 2 Interest Rate' },

        // Property 3 (Table 12)
        { table: 12, row: 0, col: 0, field: 'properties[2].address',           label: 'Property 3 Location' },
        { table: 12, row: 0, col: 2, field: 'properties[2].purchasePrice',     label: 'Property 3 Price Paid', format: 'currency' },
        { table: 12, row: 0, col: 3, field: 'properties[2].currentValue',      label: 'Property 3 Current Value', format: 'currency' },
        { table: 12, row: 0, col: 4, field: 'properties[2].purchaseDate',      label: 'Property 3 Purchase Date', format: 'date' },
        { table: 12, row: 0, col: 5, field: 'properties[2].mortgageBalance',   label: 'Property 3 Outstanding Mortgage', format: 'currency' },
        { table: 12, row: 2, col: 0, field: 'properties[2].monthlyPayment',    label: 'Property 3 Repayments', format: 'currency' },
        { table: 12, row: 2, col: 1, field: 'properties[2].rentalIncome',      label: 'Property 3 Rental Income', format: 'currency' },
        { table: 12, row: 2, col: 4, field: 'properties[2].mortgageRate',      label: 'Property 3 Interest Rate' },

        // Property 4 (Table 13)
        { table: 13, row: 0, col: 0, field: 'properties[3].address',           label: 'Property 4 Location' },
        { table: 13, row: 0, col: 2, field: 'properties[3].purchasePrice',     label: 'Property 4 Price Paid', format: 'currency' },
        { table: 13, row: 0, col: 3, field: 'properties[3].currentValue',      label: 'Property 4 Current Value', format: 'currency' },
        { table: 13, row: 0, col: 4, field: 'properties[3].purchaseDate',      label: 'Property 4 Purchase Date', format: 'date' },
        { table: 13, row: 0, col: 5, field: 'properties[3].mortgageBalance',   label: 'Property 4 Outstanding Mortgage', format: 'currency' },
        { table: 13, row: 2, col: 0, field: 'properties[3].monthlyPayment',    label: 'Property 4 Repayments', format: 'currency' },
        { table: 13, row: 2, col: 1, field: 'properties[3].rentalIncome',      label: 'Property 4 Rental Income', format: 'currency' },
        { table: 13, row: 2, col: 4, field: 'properties[3].mortgageRate',      label: 'Property 4 Interest Rate' },

        // Property 5 (Table 14)
        { table: 14, row: 0, col: 0, field: 'properties[4].address',           label: 'Property 5 Location' },
        { table: 14, row: 0, col: 2, field: 'properties[4].purchasePrice',     label: 'Property 5 Price Paid', format: 'currency' },
        { table: 14, row: 0, col: 3, field: 'properties[4].currentValue',      label: 'Property 5 Current Value', format: 'currency' },
        { table: 14, row: 0, col: 4, field: 'properties[4].purchaseDate',      label: 'Property 5 Purchase Date', format: 'date' },
        { table: 14, row: 0, col: 5, field: 'properties[4].mortgageBalance',   label: 'Property 5 Outstanding Mortgage', format: 'currency' },
        { table: 14, row: 2, col: 0, field: 'properties[4].monthlyPayment',    label: 'Property 5 Repayments', format: 'currency' },
        { table: 14, row: 2, col: 1, field: 'properties[4].rentalIncome',      label: 'Property 5 Rental Income', format: 'currency' },
        { table: 14, row: 2, col: 4, field: 'properties[4].mortgageRate',      label: 'Property 5 Interest Rate' },
    ],

    // =========================================================================
    // TABLE 15: Debt
    // 6 rows x 4 cols — Up to 4 debts (rows 2-5)
    // =========================================================================
    debts: [
        { table: 15, row: 2, col: 0, field: 'debts[0].provider',           label: 'Debt 1 Provider' },
        { table: 15, row: 2, col: 1, field: 'debts[0].outstandingBalance', label: 'Debt 1 Value', format: 'currency' },
        { table: 15, row: 2, col: 2, field: 'debts[0].monthlyPayment',    label: 'Debt 1 Repayments', format: 'currency' },
        { table: 15, row: 2, col: 3, field: 'debts[0].type',              label: 'Debt 1 Info' },

        { table: 15, row: 3, col: 0, field: 'debts[1].provider',           label: 'Debt 2 Provider' },
        { table: 15, row: 3, col: 1, field: 'debts[1].outstandingBalance', label: 'Debt 2 Value', format: 'currency' },
        { table: 15, row: 3, col: 2, field: 'debts[1].monthlyPayment',    label: 'Debt 2 Repayments', format: 'currency' },
        { table: 15, row: 3, col: 3, field: 'debts[1].type',              label: 'Debt 2 Info' },

        { table: 15, row: 4, col: 0, field: 'debts[2].provider',           label: 'Debt 3 Provider' },
        { table: 15, row: 4, col: 1, field: 'debts[2].outstandingBalance', label: 'Debt 3 Value', format: 'currency' },
        { table: 15, row: 4, col: 2, field: 'debts[2].monthlyPayment',    label: 'Debt 3 Repayments', format: 'currency' },
        { table: 15, row: 4, col: 3, field: 'debts[2].type',              label: 'Debt 3 Info' },

        { table: 15, row: 5, col: 0, field: 'debts[3].provider',           label: 'Debt 4 Provider' },
        { table: 15, row: 5, col: 1, field: 'debts[3].outstandingBalance', label: 'Debt 4 Value', format: 'currency' },
        { table: 15, row: 5, col: 2, field: 'debts[3].monthlyPayment',    label: 'Debt 4 Repayments', format: 'currency' },
        { table: 15, row: 5, col: 3, field: 'debts[3].type',              label: 'Debt 4 Info' },
    ],

    // =========================================================================
    // TABLE 16: Estate Planning
    // 5 rows x 2 cols
    // =========================================================================
    estatePlanning: [
        { table: 16, row: 3, col: 0, field: 'estatePlanning.trustDetails',  label: 'Trust Details' },
        { table: 16, row: 3, col: 1, field: 'estatePlanning.willDetails',   label: 'Will Details' },
    ],

    // =========================================================================
    // TABLE 18: Expenditure
    // 14 rows x 5 cols
    // =========================================================================
    expenditure: [
        { table: 18, row: 2,  col: 1, field: 'expenditure.mortgage',      label: 'Expenditure: Mortgage/Rent', format: 'currency' },
        { table: 18, row: 3,  col: 1, field: 'expenditure.loans',         label: 'Expenditure: Loans/Credit Cards', format: 'currency' },
        { table: 18, row: 4,  col: 1, field: 'expenditure.utilities',     label: 'Expenditure: Bills', format: 'currency' },
        { table: 18, row: 5,  col: 1, field: 'expenditure.food',          label: 'Expenditure: Food', format: 'currency' },
        { table: 18, row: 6,  col: 1, field: 'expenditure.transport',     label: 'Expenditure: Car Costs', format: 'currency' },
        { table: 18, row: 7,  col: 1, field: 'expenditure.holidays',      label: 'Expenditure: Holidays', format: 'currency' },
        { table: 18, row: 8,  col: 1, field: 'expenditure.insurance',     label: 'Expenditure: Insurance', format: 'currency' },
        { table: 18, row: 9,  col: 1, field: 'expenditure.savings',       label: 'Expenditure: Savings Plan', format: 'currency' },
        { table: 18, row: 10, col: 1, field: 'expenditure.schoolFees',    label: 'Expenditure: School Fees', format: 'currency' },
        { table: 18, row: 11, col: 1, field: 'expenditure.entertainment', label: 'Expenditure: Hobbies/Eating Out', format: 'currency' },
        { table: 18, row: 12, col: 1, field: 'expenditure.other',         label: 'Expenditure: Other', format: 'currency' },
        { table: 18, row: 13, col: 1, field: 'expenditure.totalMonthly',  label: 'Expenditure: Total', format: 'currency' },
    ],

    // =========================================================================
    // HELPER: Get all mappings as a flat array
    // =========================================================================
    getAllMappings: function() {
        return [
            ...this.personalDetails,
            ...this.employment,
            ...this.children,
            ...this.protection,
            ...this.bankAccounts,
            ...this.investments,
            ...this.pensions,
            ...this.properties,
            ...this.debts,
            ...this.estatePlanning,
            ...this.expenditure,
        ];
    },

    // =========================================================================
    // HELPER: Format a value based on format type
    // =========================================================================
    formatValue: function(value, format) {
        if (value === null || value === undefined || value === '') return '';

        switch (format) {
            case 'date':
                if (typeof value === 'string' && value.includes('-')) {
                    const d = new Date(value);
                    if (!isNaN(d)) return d.toLocaleDateString('en-GB');
                }
                return String(value);

            case 'currency':
                const num = parseFloat(value);
                if (isNaN(num)) return String(value);
                return num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            case 'childName':
                // Combine first + last name for children
                return String(value);

            case 'checkboxSingle':
                return value?.toLowerCase() === 'single' ? '\u2611' : '\u2610';
            case 'checkboxMarried':
                return value?.toLowerCase() === 'married' ? '\u2611' : '\u2610';
            case 'checkboxCivilPartner':
                return value?.toLowerCase() === 'civil partner' ? '\u2611' : '\u2610';
            case 'checkboxDivorced':
                return value?.toLowerCase() === 'divorced' ? '\u2611' : '\u2610';
            case 'checkboxWidowed':
                return value?.toLowerCase() === 'widowed' ? '\u2611' : '\u2610';

            default:
                return String(value);
        }
    },

    // =========================================================================
    // HELPER: Resolve a dot-notation path (with array indices) from client obj
    // =========================================================================
    resolveField: function(client, fieldPath) {
        const parts = fieldPath.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = client;
        for (const part of parts) {
            if (current === null || current === undefined) return null;
            current = current[part];
        }
        return current;
    }
};

if (typeof window !== 'undefined') {
    window.FactfindMapping = FactfindMapping;
}
