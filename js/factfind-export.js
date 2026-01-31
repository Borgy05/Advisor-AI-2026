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
            const win = window.open('', '_blank');
            if (win) {
                win.document.open();
                win.document.write(html);
                win.document.close();
                win.focus();
                setTimeout(() => {
                    win.print();
                }, 300);
                App.showAlert('Factfind opened for print/PDF', 'success');
                return;
            }

            // Fallback to download if popup blocked
            const blob = new Blob(['\ufeff', html], { type: 'text/html' });
            const clientName = `${client.personal?.firstName || 'Unknown'}_${client.personal?.lastName || 'Client'}`.replace(/\s+/g, '_');
            const fileName = `Factfind_${clientName}_${new Date().toISOString().split('T')[0]}.html`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            App.showAlert('Factfind downloaded (HTML)', 'success');
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

        const checkbox = (checked) => checked ? '&#x2611;' : '&#x2610;';
        const circle = (checked) => checked ? '<span class="circle checked"></span>' : '<span class="circle"></span>';
        const relationship = (val, target) => String(val || '').toLowerCase() === target;
        const currency = (val, cur) => {
            if (val === null || val === undefined || val === '') return '';
            const num = parseFloat(val);
            if (isNaN(num)) return String(val);
            const prefix = cur ? `${cur} ` : '';
            return prefix + num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const childRow = (idx) => {
            const c = (client.children || [])[idx] || {};
            return `
                <tr>
                    <td>${fullName(c)}</td>
                    <td>${formatDate(c.dateOfBirth)}</td>
                    <td>${c.age ?? ''}</td>
                    <td>${c.school || ''}</td>
                    <td>${currency(c.annualSchoolFees, c.schoolFeesCurrency)}</td>
                    <td>${c.relationship || ''}</td>
                </tr>`;
        };

        const bankRow = (idx) => {
            const b = (client.bankAccounts || [])[idx] || {};
            return `
                <tr>
                    <td>${b.bank || ''}</td>
                    <td>${currency(b.balance, b.currency)}</td>
                    <td>${b.currency || ''}</td>
                    <td>${b.interestRate || ''}</td>
                </tr>`;
        };

        const investRow = (idx) => {
            const i = (client.investments || [])[idx] || {};
            return `
                <tr>
                    <td>${i.provider || ''}</td>
                    <td>${currency(i.currentValue, i.currency)}</td>
                    <td>${i.annualReturn || ''}</td>
                    <td>${i.type || ''}</td>
                </tr>`;
        };

        const pensionRow = (idx) => {
            const p = (client.pensions || [])[idx] || {};
            return `
                <tr>
                    <td>${p.provider || ''}</td>
                    <td>${currency(p.currentValue, p.currency)}</td>
                    <td>${p.type || ''}</td>
                    <td>${p.notes || ''}</td>
                </tr>`;
        };

        const propertyRow = (idx) => {
            const pr = (client.properties || [])[idx] || {};
            return `
                <tr>
                    <td>${formatAddress(pr.address)}</td>
                    <td>${currency(pr.purchasePrice, pr.currency)}</td>
                    <td>${currency(pr.currentValue, pr.currency)}</td>
                    <td>${formatDate(pr.purchaseDate)}</td>
                    <td>${currency(pr.mortgageBalance, pr.currency)}</td>
                </tr>
                <tr>
                    <td>${currency(pr.monthlyPayment, pr.currency)}</td>
                    <td>${currency(pr.rentalIncome, pr.currency)}</td>
                    <td>${pr.mortgageProvider || ''}</td>
                    <td>${pr.mortgageRate || ''}</td>
                    <td>${formatDate(pr.mortgageEndDate)}</td>
                </tr>`;
        };

        const debtRow = (idx) => {
            const d = (client.debts || [])[idx] || {};
            return `
                <tr>
                    <td>${d.provider || ''}</td>
                    <td>${currency(d.outstandingBalance, d.currency)}</td>
                    <td>${currency(d.monthlyPayment, d.currency)}</td>
                    <td>${d.type || ''}</td>
                </tr>`;
        };

        const protectionRow = (idx) => {
            const pr = (client.protection || [])[idx] || {};
            return `
                <tr>
                    <td>${pr.provider || ''}</td>
                    <td>${pr.type || ''}</td>
                    <td>${currency(pr.premium, pr.currency)}</td>
                    <td>${pr.term || ''}</td>
                    <td>${currency(pr.sumAssured, pr.currency)}</td>
                </tr>`;
        };

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Factfind</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: "Times New Roman", serif; font-size: 10pt; color: #111; }
    .page { width: 190mm; margin: 0 auto; }
    .page-break { page-break-before: always; }
    h1 { font-size: 12pt; color: #3b1b5a; margin: 0 0 4px 0; font-weight: normal; }
    h2 { font-size: 10pt; margin: 10px 0 6px 0; color: #3b1b5a; font-weight: normal; }
    .header-line { height: 2px; background: #6a4bc4; margin: 4px 0 8px 0; }
    .header { display: flex; align-items: center; justify-content: space-between; }
    .logo { display: flex; align-items: center; gap: 6px; color: #3b1b5a; font-size: 10pt; }
    .logo-ring { width: 18px; height: 18px; border: 2px solid #7b57d1; border-radius: 50%; display: inline-block; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #2c2c54; padding: 4px 6px; vertical-align: top; }
    th { background: #3b1b5a; color: #fff; text-align: left; font-weight: normal; }
    .label { background: #f1eaf7; color: #3b1b5a; }
    .section-title { background: #3b1b5a; color: #fff; padding: 4px 6px; font-weight: normal; border: 1px solid #2c2c54; }
    .muted { color: #555; }
    .center { text-align: center; }
    .circle { display: inline-block; width: 12px; height: 12px; border: 1px solid #2c2c54; border-radius: 50%; vertical-align: middle; margin: 0 4px; }
    .circle.checked { background: #2c2c54; }
    .box { border: 1px solid #2c2c54; min-height: 32px; }
    .small { font-size: 8pt; line-height: 1.3; }
    .arrow { height: 18px; border: 1px solid #7b57d1; position: relative; margin: 6px 0; }
    .arrow:after { content: ''; position: absolute; right: -8px; top: -1px; width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-left: 8px solid #7b57d1; }
    .arrow-label { position: absolute; left: 6px; top: 2px; font-size: 8pt; color: #3b1b5a; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <h1>Financial Planning Questionnaire</h1>
        <div class="header-line"></div>
      </div>
      <div class="logo">
        <span class="logo-ring"></span>
        <div>
          <div><strong>TITAN</strong> Wealth</div>
          <div class="muted">International</div>
        </div>
      </div>
    </div>

  <h2>Personal Details</h2>
  <table>
    <tr><th class="label"></th><th>Client</th><th>Spouse/Partner</th></tr>
    <tr><td class="label">Name</td><td>${fullName(p)}</td><td>${fullName(s)}</td></tr>
    <tr>
      <td class="label">D.O.B./Age</td>
      <td>${formatDate(p.dateOfBirth)} ${p.age ? ` / ${p.age}` : ''}</td>
      <td>${formatDate(s.dateOfBirth)} ${s.age ? ` / ${s.age}` : ''}</td>
    </tr>
    <tr><td class="label">Country of Residence</td><td>${p.countryOfResidence || ''}</td><td>${s.countryOfResidence || ''}</td></tr>
    <tr><td class="label">Nationality</td><td>${p.nationality || ''}</td><td>${s.nationality || ''}</td></tr>
    <tr><td class="label">Dual Nationality</td><td>${p.dualNationality || ''}</td><td>${s.dualNationality || ''}</td></tr>
    <tr><td class="label">Date of First Meeting</td><td>${p.firstMeetingDate || ''}</td><td>${s.firstMeetingDate || ''}</td></tr>
    <tr><td class="label">Date FF Completed</td><td>${p.ffCompletedDate || ''}</td><td>${s.ffCompletedDate || ''}</td></tr>
    <tr><td class="label">Email</td><td>${p.email || ''}</td><td>${s.email || ''}</td></tr>
    <tr><td class="label">Telephone Number (Home)</td><td>${p.phoneHome || ''}</td><td>${s.phoneHome || ''}</td></tr>
    <tr><td class="label">Telephone Number (Mobile)</td><td>${p.phoneMobile || ''}</td><td>${s.phoneMobile || ''}</td></tr>
    <tr>
      <td class="label">Relationship Status</td>
      <td colspan="2">
        ${circle(relationship(p.relationshipStatus, 'single'))} Single
        ${circle(relationship(p.relationshipStatus, 'married'))} Married
        ${circle(relationship(p.relationshipStatus, 'civil partner'))} Civil Partner
        ${circle(relationship(p.relationshipStatus, 'divorced'))} Divorced
        ${circle(relationship(p.relationshipStatus, 'widowed'))} Widowed
      </td>
    </tr>
    <tr><td class="label">Address</td><td colspan="2">${formatAddress(p.address)}</td></tr>
  </table>

  <div class="section-title">Employment Information</div>
  <table>
    <tr><td class="label">Job Title</td><td>Employer</td><td class="label">Job Title</td><td>Employer</td></tr>
    <tr>
      <td>${emp.jobTitle || ''}</td>
      <td>${emp.employer || ''}</td>
      <td>${semp.jobTitle || ''}</td>
      <td>${semp.employer || ''}</td>
    </tr>
    <tr><td class="label">Monthly Income</td><td>Monthly Surplus</td><td class="label">Monthly Income</td><td>Monthly Surplus</td></tr>
    <tr>
      <td>${currency(emp.monthlyGrossIncome, emp.incomeCurrency)}</td>
      <td>${currency(emp.monthlySurplus, emp.incomeCurrency)}</td>
      <td>${currency(semp.monthlyGrossIncome, semp.incomeCurrency)}</td>
      <td>${currency(semp.monthlySurplus, semp.incomeCurrency)}</td>
    </tr>
    <tr><td class="label">Bonus Dates</td><td>Bonus Amount</td><td class="label">Bonus Dates</td><td>Bonus Amount</td></tr>
    <tr>
      <td>${emp.bonusDates || ''}</td>
      <td>${currency(emp.annualBonus, emp.incomeCurrency)}</td>
      <td>${semp.bonusDates || ''}</td>
      <td>${currency(semp.annualBonus, semp.incomeCurrency)}</td>
    </tr>
    <tr><td class="label">Employment History</td><td colspan="3" class="label">Employment History</td></tr>
    <tr>
      <td colspan="2">${emp.notes || ''}</td>
      <td colspan="2">${semp.notes || ''}</td>
    </tr>
    <tr>
      <td class="label">Additional Benefits</td>
      <td colspan="3">${emp.otherBenefits || ''}</td>
    </tr>
  </table>

  <div class="section-title">Child / Dependants</div>
  <table>
    <tr>
      <td class="label">Full Name</td><td class="label">D.O.B.</td><td class="label">Age</td><td class="label">School/University</td><td class="label">Annual Fees</td><td class="label">Who Pays</td>
    </tr>
    ${childRow(0)}
    ${childRow(1)}
    ${childRow(2)}
    ${childRow(3)}
    ${childRow(4)}
  </table>

  <div class="section-title">Protection</div>
  <table>
    <tr><td class="label">Insurance Provider</td><td class="label">Type</td><td class="label">Premium</td><td class="label">Term</td><td class="label">Cover Amount</td></tr>
    ${protectionRow(0)}
    ${protectionRow(1)}
    ${protectionRow(2)}
    <tr>
      <td colspan="5" class="label">
        Smoker (Client): ${circle(p.smoker === true)} Yes ${circle(p.smoker === false)} No
        &nbsp;&nbsp;Good Health: ${circle(p.healthStatus === 'good')} Yes ${circle(p.healthStatus === 'poor')} No
      </td>
    </tr>
    <tr>
      <td colspan="5" class="label">
        Smoker (Spouse): ${circle(s.smoker === true)} Yes ${circle(s.smoker === false)} No
        &nbsp;&nbsp;Good Health: ${circle(s.healthStatus === 'good')} Yes ${circle(s.healthStatus === 'poor')} No
      </td>
    </tr>
    <tr>
      <td colspan="5" class="label">Do you have a Will? ${circle(p.willInPlace === true)} Yes ${circle(p.willInPlace === false)} No &nbsp;&nbsp;Executor: ${p.willDate || ''}</td>
    </tr>
  </table>

  <div class="section-title">Corporate Services</div>
  <table>
    <tr><td class="label">Group Medical</td><td>${circle(false)} Yes ${circle(false)} No</td><td class="label">Provider:</td><td></td><td class="label">Expiry:</td><td></td></tr>
    <tr><td class="label">Group Life Insurance</td><td>${circle(false)} Yes ${circle(false)} No</td><td class="label">Provider:</td><td></td><td class="label">Cover:</td><td></td></tr>
    <tr><td class="label">Group Retirement Plan</td><td>${circle(false)} Yes ${circle(false)} No</td><td class="label">Provider:</td><td></td><td class="label">Contribution:</td><td></td></tr>
    <tr><td class="label">Visa Expiry Date</td><td colspan="5"></td></tr>
  </table>

  <div class="section-title">Bank Accounts</div>
  <table>
    <tr><td class="label">Bank</td><td class="label">Value</td><td class="label">Currency</td><td class="label">Interest</td></tr>
    ${bankRow(0)}${bankRow(1)}${bankRow(2)}${bankRow(3)}${bankRow(4)}${bankRow(5)}
  </table>

  <div class="section-title">Investments</div>
  <table>
    <tr><td class="label">Provider</td><td class="label">Value</td><td class="label">Return</td><td class="label">Additional Info</td></tr>
    ${investRow(0)}${investRow(1)}${investRow(2)}${investRow(3)}${investRow(4)}${investRow(5)}
  </table>

  </div>

  <div class="page-break"></div>
  <div class="page">
    <div class="header">
      <div>
        <div class="header-line"></div>
      </div>
      <div class="logo">
        <span class="logo-ring"></span>
        <div>
          <div><strong>TITAN</strong> Wealth</div>
          <div class="muted">International</div>
        </div>
      </div>
    </div>

  <div class="section-title">Pensions</div>
  <table>
    <tr><td class="label">Provider</td><td class="label">Value</td><td class="label">Type</td><td class="label">Additional Info</td></tr>
    ${pensionRow(0)}${pensionRow(1)}${pensionRow(2)}${pensionRow(3)}${pensionRow(4)}${pensionRow(5)}
  </table>

  <div class="section-title">Property</div>
  <table>
    <tr><td class="label">Location 1</td><td class="label">Price Paid</td><td class="label">Current Value</td><td class="label">Purchase Date</td><td class="label">Outstanding Mortgage</td></tr>
    ${propertyRow(0)}
  </table>
  <table>
    <tr><td class="label">Location 2</td><td class="label">Price Paid</td><td class="label">Current Value</td><td class="label">Purchase Date</td><td class="label">Outstanding Mortgage</td></tr>
    ${propertyRow(1)}
  </table>
  <table>
    <tr><td class="label">Location 3</td><td class="label">Price Paid</td><td class="label">Current Value</td><td class="label">Purchase Date</td><td class="label">Outstanding Mortgage</td></tr>
    ${propertyRow(2)}
  </table>
  <table>
    <tr><td class="label">Location 4</td><td class="label">Price Paid</td><td class="label">Current Value</td><td class="label">Purchase Date</td><td class="label">Outstanding Mortgage</td></tr>
    ${propertyRow(3)}
  </table>
  <table>
    <tr><td class="label">Location 5</td><td class="label">Price Paid</td><td class="label">Current Value</td><td class="label">Purchase Date</td><td class="label">Outstanding Mortgage</td></tr>
    ${propertyRow(4)}
  </table>

  <div class="section-title">Debt</div>
  <table>
    <tr><td class="label">Provider</td><td class="label">Value</td><td class="label">Repayments</td><td class="label">Additional Information</td></tr>
    ${debtRow(0)}${debtRow(1)}${debtRow(2)}${debtRow(3)}
  </table>

  <div class="section-title">Estate Planning</div>
  <table>
    <tr><td class="label">Total Net Worth</td><td class="label">Potential IHT / Estate Duty</td></tr>
    <tr><td></td><td></td></tr>
    <tr><td class="label">Trust Details</td><td class="label">Will Details</td></tr>
    <tr><td>${client.estatePlanning?.trustDetails || ''}</td><td>${client.estatePlanning?.willLocation || ''}</td></tr>
  </table>

  <div class="section-title">Tax Return</div>
  <table>
    <tr><td class="label">Refer to ATC</td><td>${circle(false)} Yes ${circle(false)} No</td></tr>
    <tr><td class="label">Notes</td><td></td></tr>
  </table>

  <div class="section-title">Expenditure</div>
  <table>
    <tr><th></th><th>Current Expenditure</th><th>Retirement Expenditure</th><th>On First Death</th><th>Is This Essential?</th></tr>
    <tr><td>Mortgage / Rent</td><td>${currency(exp.mortgage, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Loans / Credit Cards</td><td>${currency(exp.loans, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Bills</td><td>${currency(exp.utilities, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Food</td><td>${currency(exp.food, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Car Costs</td><td>${currency(exp.transport, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Holidays</td><td>${currency(exp.holidays, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Insurance</td><td>${currency(exp.insurance, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Savings Plan</td><td>${currency(exp.savings, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>School Fees</td><td>${currency(exp.schoolFees, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Hobbies / Eating Out</td><td>${currency(exp.entertainment, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Other</td><td>${currency(exp.other, exp.currency)}</td><td></td><td></td><td></td></tr>
    <tr><td>Total</td><td>${currency(exp.totalMonthly, exp.currency)}</td><td></td><td></td><td></td></tr>
  </table>
  </div>

  <div class="page-break"></div>
  <div class="page">
    <div class="header">
      <div>
        <div class="header-line"></div>
      </div>
      <div class="logo">
        <span class="logo-ring"></span>
        <div>
          <div><strong>TITAN</strong> Wealth</div>
          <div class="muted">International</div>
        </div>
      </div>
    </div>

    <div class="section-title">Required Features</div>
    <div class="box" style="height: 70px;"></div>

    <h2>What's your attitude to risk?</h2>
    <table>
      <tr>
        <td class="center">1<br>${circle(false)}</td>
        <td class="center">2<br>${circle(false)}</td>
        <td class="center">3<br>${circle(false)}</td>
        <td class="center">4<br>${circle(false)}</td>
        <td class="center">5<br>${circle(false)}</td>
      </tr>
    </table>
    <div class="muted">Low<span style="float:right;">High</span></div>

    <div class="section-title" style="margin-top:10px;">What is the value of money to you?</div>
    <div class="box" style="height: 40px;"></div>

    <div class="section-title" style="margin-top:10px;">Short/Medium/Long Term Plans</div>
    <div class="arrow"><div class="arrow-label">5 Years</div></div>
    <div class="arrow"><div class="arrow-label">10 Years</div></div>
    <div class="arrow"><div class="arrow-label">15 Years</div></div>
    <div class="arrow"><div class="arrow-label">Retirement Age:</div></div>
    <div class="arrow"><div class="arrow-label">Future Residential Plans:</div></div>

    <h2>Financial Goals & Objectives</h2>
    <table>
      <tr><td class="label">Priorities</td><td class="label">Retirement</td></tr>
      <tr><td class="box" style="height:140px;"></td><td class="box" style="height:140px;"></td></tr>
      <tr><td class="label">Milestone</td><td class="label">Milestone</td></tr>
      <tr><td class="box" style="height:60px;"></td><td class="box" style="height:60px;"></td></tr>
    </table>
  </div>
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
