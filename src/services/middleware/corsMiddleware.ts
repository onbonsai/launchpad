import { NextApiRequest, NextApiResponse } from 'next';
import Cors from "cors";

import runMiddleware from './run';

export default (req: NextApiRequest, res: NextApiResponse, { methods = ["GET", "HEAD"] }: { methods: string[] }) => (
  runMiddleware(req, res, Cors({ methods }))
);
