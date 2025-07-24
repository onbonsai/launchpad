import { NextApiRequest, NextApiResponse } from 'next';

// In a real app, you'd store these in a database
// For now, we'll keep them in memory (they'll reset on server restart)
const violations: any[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return violations for analysis
    const grouped = violations.reduce((acc, violation) => {
      const key = `${violation.violatedDirective}:${violation.blockedUri}`;
      if (!acc[key]) {
        acc[key] = {
          ...violation,
          count: 0,
          firstSeen: violation.timestamp,
          lastSeen: violation.timestamp,
        };
      }
      acc[key].count++;
      acc[key].lastSeen = violation.timestamp;
      return acc;
    }, {});

    res.status(200).json({
      total: violations.length,
      unique: Object.keys(grouped).length,
      violations: Object.values(grouped).sort((a: any, b: any) => b.count - a.count),
    });
  } else if (req.method === 'POST') {
    // Store violation (called from csp-report.ts in the future if needed)
    violations.push(req.body);
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 