import { NextApiRequest, NextApiResponse } from 'next';

interface CSPViolation {
  'csp-report': {
    'document-uri': string;
    'referrer': string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'disposition': string;
    'blocked-uri': string;
    'line-number': number;
    'column-number': number;
    'source-file': string;
    'status-code': number;
    'script-sample': string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const violation = req.body as CSPViolation;
    const report = violation['csp-report'];

    const violationData = {
      documentUri: report['document-uri'],
      violatedDirective: report['violated-directive'],
      effectiveDirective: report['effective-directive'],
      blockedUri: report['blocked-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
      disposition: report['disposition'], // "report" for report-only mode
      timestamp: new Date().toISOString(),
    };

    // Log the violation for analysis
    console.log('🚨 CSP Violation Report:', violationData);

    // Store violation for dashboard analysis
    try {
      await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/csp-violations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(violationData),
      });
    } catch (error) {
      console.error('Failed to store violation:', error);
    }

    // In production, you might want to store these in a database or send to a monitoring service

    res.status(204).end(); // No content response as per CSP spec
  } catch (error) {
    console.error('Error processing CSP report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 