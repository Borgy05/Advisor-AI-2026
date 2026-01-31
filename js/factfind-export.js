/**
 * Adviser AI - Factfind Word Export
 *
 * Exports client data into the TWI Factfind Word template (.docx).
 * Preserves EXACT layout, colours, margins, and formatting by modifying
 * the original template XML directly using JSZip.
 *
 * Approach:
 *  1. Fetch the template .docx (which is a ZIP of XML files)
 *  2. Unzip with JSZip
 *  3. Parse word/document.xml
 *  4. Find table cells by table/row/col index
 *  5. Insert client data into the correct cells
 *  6. Re-zip and trigger download
 */

const FactfindExport = {

    TEMPLATE_PATH: 'TWI - Factfind Word template.docx',

    getTemplateUrl: function() {
        const encoded = encodeURI(this.TEMPLATE_PATH);
        // Prefer same-origin (GitHub Pages will serve from repo root)
        const sameOriginUrl = encoded;
        // Fallback to raw GitHub URL (useful if Pages doesn't serve the .docx correctly)
        const rawUrl = 'https://raw.githubusercontent.com/Borgy05/Advisor-AI-2026/main/' + encoded;
        return { sameOriginUrl, rawUrl };
    },

    /**
     * Export a client's data to a populated factfind Word document
     */
    exportForClient: async function(client) {
        try {
            App.showAlert('Generating factfind document...', 'info');

            // 1. Fetch the template (try same-origin first, then fallback)
            const { sameOriginUrl, rawUrl } = this.getTemplateUrl();
            let response = await fetch(sameOriginUrl, { cache: 'no-store' });
            if (!response.ok) {
                response = await fetch(rawUrl, { cache: 'no-store' });
            }
            if (!response.ok) throw new Error('Could not load factfind template');
            const templateBlob = await response.arrayBuffer();

            // Detect Git LFS pointer (Pages/Raw can return pointer text)
            try {
                const head = new TextDecoder().decode(templateBlob.slice(0, 200));
                if (head.includes('git-lfs') && head.includes('oid sha256')) {
                    throw new Error('Template file is a Git LFS pointer. Please publish the actual .docx in the repo.');
                }
            } catch (e) {
                // If TextDecoder fails, continue
            }

            // 2. Unzip
            const zip = await JSZip.loadAsync(templateBlob);

            // 3. Get the main document XML
            const docXml = await zip.file('word/document.xml').async('string');

            // 4. Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(docXml, 'application/xml');

            // 5. Find all tables in the document
            const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
            const tables = xmlDoc.getElementsByTagNameNS(ns, 'tbl');

            // 6. Apply all mappings
            const allMappings = FactfindMapping.getAllMappings();
            let fieldsPopulated = 0;
            let fieldsWithValues = 0;
            let tablesFound = tables ? tables.length : 0;
            const debugSamples = [];

            for (const mapping of allMappings) {
                const value = FactfindMapping.resolveField(client, mapping.field);
                if (value === null || value === undefined || value === '') continue;
                fieldsWithValues++;

                const formattedValue = FactfindMapping.formatValue(value, mapping.format);
                if (!formattedValue) continue;

                const table = tables[mapping.table];
                if (!table) continue;

                const success = this.setCellText(table, mapping.row, mapping.col, formattedValue, ns);
                if (success) fieldsPopulated++;

                if (debugSamples.length < 5) {
                    debugSamples.push({
                        field: mapping.field,
                        value: formattedValue,
                        table: mapping.table,
                        row: mapping.row,
                        col: mapping.col,
                        success
                    });
                }
            }

            console.log('[FactfindExport] tables found:', tablesFound);
            console.log('[FactfindExport] mappings total:', allMappings.length);
            console.log('[FactfindExport] fields with values:', fieldsWithValues);
            console.log('[FactfindExport] fields populated:', fieldsPopulated);
            console.log('[FactfindExport] sample mappings:', debugSamples);

            this.showDebugOverlay({
                tablesFound,
                mappingsTotal: allMappings.length,
                fieldsWithValues,
                fieldsPopulated
            });

            // 7. Serialize back to XML string
            const serializer = new XMLSerializer();
            const updatedXml = serializer.serializeToString(xmlDoc);

            // 8. Replace the document.xml in the zip
            zip.file('word/document.xml', updatedXml);

            // 9. Generate the output file
            const outputBlob = await zip.generateAsync({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            // 10. Trigger download
            const clientName = `${client.personal.firstName || 'Unknown'}_${client.personal.lastName || 'Client'}`.replace(/\s+/g, '_');
            const fileName = `Factfind_${clientName}_${new Date().toISOString().split('T')[0]}.docx`;

            const url = URL.createObjectURL(outputBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            App.showAlert(`Factfind exported with ${fieldsPopulated} fields populated`, 'success');

        } catch (error) {
            console.error('Factfind export error:', error);
            App.showAlert('Factfind export failed: ' + error.message, 'danger');
        }
    },

    /**
     * Export a factfind as a Word-compatible HTML .doc
     * This avoids .docx XML table mapping issues.
     */
    exportAsHtmlDoc: function(client) {
        try {
            const html = this.buildHtmlFactfind(client);
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const clientName = `${client.personal?.firstName || 'Unknown'}_${client.personal?.lastName || 'Client'}`.replace(/\s+/g, '_');
            const fileName = `Factfind_${clientName}_${new Date().toISOString().split('T')[0]}.doc`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            App.showAlert('Factfind exported (HTML Word)', 'success');
        } catch (error) {
            console.error('Factfind HTML export error:', error);
            App.showAlert('Factfind HTML export failed: ' + error.message, 'danger');
        }
    },

    buildHtmlFactfind: function(client) {
        const formatDate = (val) => {
            if (!val) return '';
            const d = new Date(val);
            if (isNaN(d)) return String(val);
            return d.toLocaleDateString('en-GB');
        };

        const formatCurrency = (val) => {
            if (val === null || val === undefined || val === '') return '';
            const num = parseFloat(val);
            if (isNaN(num)) return String(val);
            return num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const fullName = (person) => {
            if (!person) return '';
            const first = person.preferredName || person.firstName || '';
            const last = person.lastName || '';
            return `${first} ${last}`.trim();
        };

        const formatAddress = (addr) => {
            if (!addr) return '';
            const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postcode, addr.country].filter(Boolean);
            return parts.join(', ');
        };

        const p = client.personal || {};
        const s = client.spouse || {};
        const emp = client.employment || {};
        const semp = client.spouseEmployment || {};
        const goals = client.goals || {};
        const risk = client.riskAttitude || {};
        const exp = client.expenditure || {};

        const childrenRows = (client.children || []).map((c, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${fullName(c)}</td>
                <td>${formatDate(c.dateOfBirth)}</td>
                <td>${c.age ?? ''}</td>
                <td>${c.school || ''}</td>
                <td>${formatCurrency(c.annualSchoolFees)}</td>
            </tr>
        `).join('');

        const pensionRows = (client.pensions || []).map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${p.provider || ''}</td>
                <td>${formatCurrency(p.currentValue)}</td>
                <td>${p.type || ''}</td>
            </tr>
        `).join('');

        const propertyRows = (client.properties || []).map((p, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${formatAddress(p.address)}</td>
                <td>${formatCurrency(p.purchasePrice)}</td>
                <td>${formatCurrency(p.currentValue)}</td>
                <td>${formatDate(p.purchaseDate)}</td>
                <td>${formatCurrency(p.mortgageBalance)}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Factfind</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
    h1 { font-size: 18pt; margin: 0 0 10px 0; }
    h2 { font-size: 13pt; margin: 16px 0 6px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #999; padding: 4px 6px; vertical-align: top; }
    th { background: #f2f2f2; text-align: left; }
    .muted { color: #555; }
  </style>
</head>
<body>
  <h1>Financial Planning Questionnaire</h1>
  <div class="muted">Exported: ${new Date().toLocaleString('en-GB')}</div>

  <h2>Personal Details</h2>
  <table>
    <tr><th></th><th>Client</th><th>Spouse/Partner</th></tr>
    <tr><td>Name</td><td>${fullName(p)}</td><td>${fullName(s)}</td></tr>
    <tr><td>DOB</td><td>${formatDate(p.dateOfBirth)}</td><td>${formatDate(s.dateOfBirth)}</td></tr>
    <tr><td>Age</td><td>${p.age ?? ''}</td><td>${s.age ?? ''}</td></tr>
    <tr><td>Country of Residence</td><td>${p.countryOfResidence || ''}</td><td>${s.countryOfResidence || ''}</td></tr>
    <tr><td>Nationality</td><td>${p.nationality || ''}</td><td>${s.nationality || ''}</td></tr>
    <tr><td>Email</td><td>${p.email || ''}</td><td>${s.email || ''}</td></tr>
    <tr><td>Phone (Home)</td><td>${p.phoneHome || ''}</td><td>${s.phoneHome || ''}</td></tr>
    <tr><td>Phone (Mobile)</td><td>${p.phoneMobile || ''}</td><td>${s.phoneMobile || ''}</td></tr>
    <tr><td>Address</td><td colspan="2">${formatAddress(p.address)}</td></tr>
  </table>

  <h2>Employment</h2>
  <table>
    <tr><th></th><th>Client</th><th>Spouse/Partner</th></tr>
    <tr><td>Status</td><td>${emp.status || ''}</td><td>${semp.status || ''}</td></tr>
    <tr><td>Job Title</td><td>${emp.jobTitle || ''}</td><td>${semp.jobTitle || ''}</td></tr>
    <tr><td>Employer</td><td>${emp.employer || ''}</td><td>${semp.employer || ''}</td></tr>
    <tr><td>Monthly Gross Income</td><td>${formatCurrency(emp.monthlyGrossIncome)}</td><td>${formatCurrency(semp.monthlyGrossIncome)}</td></tr>
    <tr><td>Retirement Age</td><td>${emp.retirementAge ?? ''}</td><td>${semp.retirementAge ?? ''}</td></tr>
  </table>

  <h2>Children / Dependants</h2>
  <table>
    <tr><th>#</th><th>Name</th><th>DOB</th><th>Age</th><th>School</th><th>Annual Fees</th></tr>
    ${childrenRows || '<tr><td colspan="6">None</td></tr>'}
  </table>

  <h2>Pensions</h2>
  <table>
    <tr><th>#</th><th>Provider</th><th>Value</th><th>Type</th></tr>
    ${pensionRows || '<tr><td colspan="4">None</td></tr>'}
  </table>

  <h2>Properties</h2>
  <table>
    <tr><th>#</th><th>Location</th><th>Purchase Price</th><th>Current Value</th><th>Purchase Date</th><th>Mortgage Balance</th></tr>
    ${propertyRows || '<tr><td colspan="6">None</td></tr>'}
  </table>

  <h2>Goals & Risk</h2>
  <table>
    <tr><td>Short Term Goals</td><td>${goals.shortTerm || ''}</td></tr>
    <tr><td>Medium Term Goals</td><td>${goals.mediumTerm || ''}</td></tr>
    <tr><td>Long Term Goals</td><td>${goals.longTerm || ''}</td></tr>
    <tr><td>Retirement Age</td><td>${goals.retirementAge ?? ''}</td></tr>
    <tr><td>Risk Tolerance</td><td>${risk.riskTolerance ?? ''}</td></tr>
  </table>

  <h2>Expenditure (Monthly)</h2>
  <table>
    <tr><td>Mortgage / Rent</td><td>${formatCurrency(exp.mortgage)}</td></tr>
    <tr><td>Loans / Credit Cards</td><td>${formatCurrency(exp.loans)}</td></tr>
    <tr><td>Utilities</td><td>${formatCurrency(exp.utilities)}</td></tr>
    <tr><td>Food</td><td>${formatCurrency(exp.food)}</td></tr>
    <tr><td>Transport</td><td>${formatCurrency(exp.transport)}</td></tr>
    <tr><td>Insurance</td><td>${formatCurrency(exp.insurance)}</td></tr>
    <tr><td>Savings</td><td>${formatCurrency(exp.savings)}</td></tr>
    <tr><td>Other</td><td>${formatCurrency(exp.other)}</td></tr>
  </table>
</body>
</html>`;
    },

    showDebugOverlay: function(stats) {
        try {
            let el = document.getElementById('factfind-debug-overlay');
            if (!el) {
                el = document.createElement('div');
                el.id = 'factfind-debug-overlay';
                el.style.position = 'fixed';
                el.style.bottom = '16px';
                el.style.right = '16px';
                el.style.zIndex = '99999';
                el.style.background = 'rgba(0,0,0,0.8)';
                el.style.color = '#fff';
                el.style.padding = '10px 12px';
                el.style.borderRadius = '6px';
                el.style.fontSize = '12px';
                el.style.fontFamily = 'Arial, sans-serif';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
                document.body.appendChild(el);
            }
            el.textContent = `Factfind debug: tables=${stats.tablesFound}, mappings=${stats.mappingsTotal}, values=${stats.fieldsWithValues}, populated=${stats.fieldsPopulated}`;
        } catch (e) {
            // no-op for debug overlay
        }
    },

    /**
     * Set text content of a specific cell in a Word table.
     * Preserves ALL existing formatting (fonts, sizes, colours, borders).
     * Only replaces/adds the text content within the first paragraph's first run.
     */
    setCellText: function(table, rowIndex, colIndex, text, ns) {
        try {
            const rows = table.getElementsByTagNameNS(ns, 'tr');
            if (rowIndex >= rows.length) return false;

            const row = rows[rowIndex];
            const cells = row.getElementsByTagNameNS(ns, 'tc');
            if (colIndex >= cells.length) return false;

            const cell = cells[colIndex];

            // Find first paragraph in the cell
            let para = cell.getElementsByTagNameNS(ns, 'p')[0];
            if (!para) {
                // Create paragraph if none exists
                para = cell.ownerDocument.createElementNS(ns, 'w:p');
                cell.appendChild(para);
            }

            // Find or create a run (w:r) in the paragraph
            let run = para.getElementsByTagNameNS(ns, 'r')[0];
            if (!run) {
                run = cell.ownerDocument.createElementNS(ns, 'w:r');

                // Copy run properties from existing runs in same table for consistency
                const existingRuns = table.getElementsByTagNameNS(ns, 'r');
                if (existingRuns.length > 0) {
                    const existingRpr = existingRuns[0].getElementsByTagNameNS(ns, 'rPr')[0];
                    if (existingRpr) {
                        run.appendChild(existingRpr.cloneNode(true));
                    }
                }

                para.appendChild(run);
            }

            // Find or create text element (w:t)
            let textEl = run.getElementsByTagNameNS(ns, 't')[0];
            if (!textEl) {
                textEl = cell.ownerDocument.createElementNS(ns, 'w:t');
                textEl.setAttribute('xml:space', 'preserve');
                run.appendChild(textEl);
            }

            // Set the text content
            textEl.textContent = text;

            return true;
        } catch (e) {
            console.warn(`Failed to set cell [${rowIndex},${colIndex}]:`, e);
            return false;
        }
    },

    /**
     * Generate a mapping reference document showing all field mappings
     * Downloads as a readable text file
     */
    exportMappingDocument: function() {
        const sections = [
            { name: 'Personal Details (Table 0)',     data: FactfindMapping.personalDetails },
            { name: 'Employment (Table 3)',            data: FactfindMapping.employment },
            { name: 'Children/Dependants (Table 4)',   data: FactfindMapping.children },
            { name: 'Protection/Insurance (Table 5)',  data: FactfindMapping.protection },
            { name: 'Bank Accounts (Table 7)',         data: FactfindMapping.bankAccounts },
            { name: 'Investments (Table 8)',           data: FactfindMapping.investments },
            { name: 'Pensions (Table 9)',              data: FactfindMapping.pensions },
            { name: 'Properties (Tables 10-14)',       data: FactfindMapping.properties },
            { name: 'Debts (Table 15)',                data: FactfindMapping.debts },
            { name: 'Estate Planning (Table 16)',      data: FactfindMapping.estatePlanning },
            { name: 'Expenditure (Table 18)',          data: FactfindMapping.expenditure },
        ];

        let doc = '==========================================================\n';
        doc +=    '  TWI FACTFIND — FIELD MAPPING REFERENCE\n';
        doc +=    '==========================================================\n\n';
        doc +=    'This document shows how each cell in the TWI Factfind\n';
        doc +=    'Word template maps to a field in the client database.\n\n';
        doc +=    'TERMINOLOGY:\n';
        doc +=    '  • Database Field = data point in the client JSON record\n';
        doc +=    '  • Factfind Cell  = table cell in the Word template\n';
        doc +=    '    identified by Table number, Row, Column\n\n';
        doc +=    `Total mappings: ${FactfindMapping.getAllMappings().length}\n`;
        doc +=    `Generated: ${new Date().toISOString()}\n\n`;

        for (const section of sections) {
            doc += '==========================================================\n';
            doc += `  ${section.name}\n`;
            doc += '==========================================================\n\n';

            doc += padRight('Factfind Cell', 25) + padRight('Database Field', 45) + 'Label\n';
            doc += padRight('-'.repeat(24), 25) + padRight('-'.repeat(44), 45) + '-'.repeat(30) + '\n';

            for (const m of section.data) {
                const cell = `Table ${m.table}, R${m.row}, C${m.col}`;
                doc += padRight(cell, 25) + padRight(m.field, 45) + m.label + '\n';
            }
            doc += '\n';
        }

        function padRight(str, len) {
            return str.length >= len ? str : str + ' '.repeat(len - str.length);
        }

        const blob = new Blob([doc], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Factfind_Field_Mapping_Reference.txt';
        a.click();
        URL.revokeObjectURL(url);

        App.showAlert('Mapping reference document downloaded', 'success');
    }
};

if (typeof window !== 'undefined') {
    window.FactfindExport = FactfindExport;
}
