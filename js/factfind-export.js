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
            const tables = xmlDoc.getElementsByTagName('w:tbl');

            // 6. Apply all mappings
            const allMappings = FactfindMapping.getAllMappings();
            let fieldsPopulated = 0;

            for (const mapping of allMappings) {
                const value = FactfindMapping.resolveField(client, mapping.field);
                if (value === null || value === undefined || value === '') continue;

                const formattedValue = FactfindMapping.formatValue(value, mapping.format);
                if (!formattedValue) continue;

                const table = tables[mapping.table];
                if (!table) continue;

                const success = this.setCellText(table, mapping.row, mapping.col, formattedValue, ns);
                if (success) fieldsPopulated++;
            }

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
     * Set text content of a specific cell in a Word table.
     * Preserves ALL existing formatting (fonts, sizes, colours, borders).
     * Only replaces/adds the text content within the first paragraph's first run.
     */
    setCellText: function(table, rowIndex, colIndex, text, ns) {
        try {
            const rows = table.getElementsByTagName('w:tr');
            if (rowIndex >= rows.length) return false;

            const row = rows[rowIndex];
            const cells = row.getElementsByTagName('w:tc');
            if (colIndex >= cells.length) return false;

            const cell = cells[colIndex];

            // Find first paragraph in the cell
            let para = cell.getElementsByTagName('w:p')[0];
            if (!para) {
                // Create paragraph if none exists
                para = cell.ownerDocument.createElementNS(ns, 'w:p');
                cell.appendChild(para);
            }

            // Find or create a run (w:r) in the paragraph
            let run = para.getElementsByTagName('w:r')[0];
            if (!run) {
                run = cell.ownerDocument.createElementNS(ns, 'w:r');

                // Copy run properties from existing runs in same table for consistency
                const existingRuns = table.getElementsByTagName('w:r');
                if (existingRuns.length > 0) {
                    const existingRpr = existingRuns[0].getElementsByTagName('w:rPr')[0];
                    if (existingRpr) {
                        run.appendChild(existingRpr.cloneNode(true));
                    }
                }

                para.appendChild(run);
            }

            // Find or create text element (w:t)
            let textEl = run.getElementsByTagName('w:t')[0];
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
