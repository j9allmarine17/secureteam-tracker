import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { execSync } from 'child_process';
import { storage } from './directStorage';

const reportTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{title}}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            color: #333333;
            line-height: 1.6;
        }
        .header {
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            color: #1f2937;
            font-size: 28px;
            font-weight: bold;
        }
        .header .subtitle {
            color: #6b7280;
            font-size: 16px;
            margin-top: 5px;
        }
        .meta-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
        }
        .meta-info div {
            text-align: center;
        }
        .meta-info .label {
            font-weight: bold;
            color: #374151;
            font-size: 14px;
        }
        .meta-info .value {
            color: #6b7280;
            font-size: 18px;
            margin-top: 5px;
        }
        .description {
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .findings-section {
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .finding {
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .finding-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .finding-title {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
            margin: 0;
        }
        .severity {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .severity.critical {
            background-color: #fee2e2;
            color: #dc2626;
        }
        .severity.high {
            background-color: #fef3c7;
            color: #d97706;
        }
        .severity.medium {
            background-color: #fef9e3;
            color: #f59e0b;
        }
        .severity.low {
            background-color: #ecfdf5;
            color: #059669;
        }
        .finding-description {
            color: #4b5563;
            margin-bottom: 15px;
        }
        .finding-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        .detail-item {
            background-color: #f9fafb;
            padding: 10px;
            border-radius: 6px;
        }
        .detail-label {
            font-weight: bold;
            color: #374151;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .detail-value {
            color: #6b7280;
        }
        .status {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status.open {
            background-color: #fee2e2;
            color: #dc2626;
        }
        .status.in-progress {
            background-color: #fef3c7;
            color: #d97706;
        }
        .status.resolved {
            background-color: #ecfdf5;
            color: #059669;
        }
        .summary {
            background-color: #f3f4f6;
            padding: 25px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            text-align: center;
        }
        .summary-item {
            background-color: #ffffff;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
        }
        .summary-number {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
        }
        .summary-label {
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
            margin-top: 5px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        @media print {
            body { margin: 0; }
            .finding { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        <div class="subtitle">Security Assessment Report</div>
    </div>
    
    <div class="meta-info">
        <div>
            <div class="label">Generated Date</div>
            <div class="value">{{generatedDate}}</div>
        </div>
        <div>
            <div class="label">Total Findings</div>
            <div class="value">{{totalFindings}}</div>
        </div>
        <div>
            <div class="label">Generated By</div>
            <div class="value">{{generatedBy}}</div>
        </div>
        <div>
            <div class="label">Format</div>
            <div class="value">{{format}}</div>
        </div>
    </div>
    
    {{#if description}}
    <div class="description">
        <h3 style="margin-top: 0; color: #374151;">Executive Summary</h3>
        <p style="margin-bottom: 0;">{{description}}</p>
    </div>
    {{/if}}
    
    <div class="findings-section">
        <h2 class="section-title">Security Findings</h2>
        {{#each findings}}
        <div class="finding">
            <div class="finding-header">
                <h3 class="finding-title">{{title}}</h3>
                <span class="severity {{severity}}">{{severity}}</span>
            </div>
            <div class="finding-description">{{description}}</div>
            <div class="finding-details">
                <div class="detail-item">
                    <div class="detail-label">Category</div>
                    <div class="detail-value">{{category}}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="status {{status}}">{{status}}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Reported By</div>
                    <div class="detail-value">{{reportedBy.firstName}} {{reportedBy.lastName}}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Discovered</div>
                    <div class="detail-value">{{formatDate createdAt}}</div>
                </div>
            </div>
            {{#if impact}}
            <div style="margin-top: 15px;">
                <div class="detail-label">Impact</div>
                <div class="detail-value">{{impact}}</div>
            </div>
            {{/if}}
            {{#if remediation}}
            <div style="margin-top: 15px;">
                <div class="detail-label">Remediation</div>
                <div class="detail-value">{{remediation}}</div>
            </div>
            {{/if}}
        </div>
        {{/each}}
    </div>
    
    <div class="summary">
        <h2 class="section-title">Summary</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-number">{{summary.critical}}</div>
                <div class="summary-label">Critical</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">{{summary.high}}</div>
                <div class="summary-label">High</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">{{summary.medium}}</div>
                <div class="summary-label">Medium</div>
            </div>
            <div class="summary-item">
                <div class="summary-number">{{summary.low}}</div>
                <div class="summary-label">Low</div>
            </div>
        </div>
    </div>
    
    <div class="footer">
        Generated by RedTeam Collab - Penetration Testing Platform<br>
        This report contains confidential security information and should be handled accordingly.
    </div>
</body>
</html>
`;

// Register Handlebars helper for date formatting
Handlebars.registerHelper('formatDate', (date: string) => {
    return new Date(date).toLocaleDateString();
});

export async function generateReport(reportData: {
    title: string;
    description?: string;
    findings: number[];
    format: string;
    generatedById: string;
}): Promise<{ buffer: Buffer; filename: string }> {
    try {
        // Fetch the findings with full details
        const findingsDetails = await Promise.all(
            reportData.findings.map(id => storage.getFinding(id))
        );
        
        // Filter out any null findings
        const validFindings = findingsDetails.filter(f => f !== undefined);
        
        // Get the user who generated the report
        const generatedBy = await storage.getUser(reportData.generatedById);
        
        // Calculate summary statistics
        const summary = {
            critical: validFindings.filter(f => f.severity === 'critical').length,
            high: validFindings.filter(f => f.severity === 'high').length,
            medium: validFindings.filter(f => f.severity === 'medium').length,
            low: validFindings.filter(f => f.severity === 'low').length,
        };
        
        // Prepare template data
        const templateData = {
            title: reportData.title,
            description: reportData.description,
            generatedDate: new Date().toLocaleDateString(),
            totalFindings: validFindings.length,
            generatedBy: `${generatedBy?.firstName} ${generatedBy?.lastName}`,
            format: reportData.format.toUpperCase(),
            findings: validFindings,
            summary
        };
        
        // Compile the template
        const template = Handlebars.compile(reportTemplate);
        const html = template(templateData);
        
        if (reportData.format === 'html') {
            const filename = `${reportData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.html`;
            return {
                buffer: Buffer.from(html, 'utf8'),
                filename
            };
        }
        
        // Generate PDF using Puppeteer (with fallback to HTML)
        if (reportData.format === 'pdf') {
            try {
                console.log('Attempting PDF generation...');
                
                // Check environment variable first
                let chromiumPath = process.env.CHROMIUM_EXECUTABLE_PATH;
                
                if (!chromiumPath) {
                    // Try multiple Chrome/Chromium paths
                    const possiblePaths = [
                        '/usr/bin/chromium-browser',           // Ubuntu/Debian standard
                        '/usr/bin/chromium',                   // Alternative Ubuntu path
                        '/usr/bin/google-chrome',              // Google Chrome
                        '/usr/bin/google-chrome-stable',       // Google Chrome stable
                        '/opt/google/chrome/chrome',           // Google Chrome alternative
                        '/snap/bin/chromium',                  // Snap package
                        '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser', // Nix store (Replit)
                    ];
                    
                    console.log('Searching for Chromium in standard paths...');
                    for (const path of possiblePaths) {
                        try {
                            require('fs').accessSync(path, require('fs').constants.F_OK);
                            chromiumPath = path;
                            console.log('Found Chromium at:', path);
                            break;
                        } catch {}
                    }
                }
                
                if (!chromiumPath) {
                    // Try dynamic detection
                    console.log('Attempting dynamic Chromium detection...');
                    try {
                        chromiumPath = execSync('which chromium-browser || which chromium || which google-chrome || which google-chrome-stable', { encoding: 'utf8' }).trim();
                        console.log('Dynamic detection found:', chromiumPath);
                    } catch (error) {
                        console.error('Dynamic detection failed:', error);
                        throw new Error('No Chrome/Chromium executable found. Please install chromium-browser: sudo apt install chromium-browser');
                    }
                }
                
                console.log('Using Chromium path:', chromiumPath);

                const browser = await puppeteer.launch({
                    headless: true,
                    executablePath: chromiumPath,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox', 
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-extensions',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding'
                    ]
                });
                
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: 'networkidle0' });
                
                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    margin: {
                        top: '20mm',
                        right: '15mm',
                        bottom: '20mm',
                        left: '15mm'
                    },
                    printBackground: true
                });
                
                await browser.close();
                
                const filename = `${reportData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
                
                return {
                    buffer: Buffer.from(pdfBuffer),
                    filename
                };
            } catch (pdfError) {
                const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
                console.warn('PDF generation failed, falling back to HTML:', errorMessage);
                // Fallback to HTML format
                const filename = `${reportData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.html`;
                return {
                    buffer: Buffer.from(html, 'utf8'),
                    filename
                };
            }
        }
        
        // Default to HTML format if PDF fails or Chrome not available
        const filename = `${reportData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.html`;
        return {
            buffer: Buffer.from(html, 'utf8'),
            filename
        };
        
    } catch (error) {
        console.error('Error generating report:', error);
        
        // If it's a Puppeteer/Chrome error, fallback to HTML
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage && errorMessage.includes('Chrome')) {
            console.warn('Chrome not available, generating HTML report instead');
            const filename = `${reportData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.html`;
            
            // Prepare template data again for HTML fallback
            const findingsDetails = await Promise.all(
                reportData.findings.map(id => storage.getFinding(id))
            );
            const validFindings = findingsDetails.filter(f => f !== undefined);
            const generatedBy = await storage.getUser(reportData.generatedById);
            
            const summary = {
                critical: validFindings.filter(f => f.severity === 'critical').length,
                high: validFindings.filter(f => f.severity === 'high').length,
                medium: validFindings.filter(f => f.severity === 'medium').length,
                low: validFindings.filter(f => f.severity === 'low').length,
            };
            
            const templateData = {
                title: reportData.title,
                description: reportData.description,
                generatedDate: new Date().toLocaleDateString(),
                totalFindings: validFindings.length,
                generatedBy: `${generatedBy?.firstName} ${generatedBy?.lastName}`,
                format: 'HTML',
                findings: validFindings,
                summary
            };
            
            const template = Handlebars.compile(reportTemplate);
            const html = template(templateData);
            
            return {
                buffer: Buffer.from(html, 'utf8'),
                filename
            };
        }
        
        throw new Error('Failed to generate report');
    }
}