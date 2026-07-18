import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import route handlers
import * as AuthEmailOtp from '../backend/routes/auth/email-otp/route.ts';
import * as AuthPhoneOtp from '../backend/routes/auth/phone-otp/route.ts';
import * as AuthWhatsappOtp from '../backend/routes/auth/whatsapp-otp/route.ts';
import * as ErpInventory from '../backend/routes/erp/inventory/route.ts';
import * as ErpMaster from '../backend/routes/erp/master/route.ts';
import * as ErpTransactions from '../backend/routes/erp/transactions/route.ts';
import * as Keys from '../backend/routes/keys/route.ts';
import * as LedgerSync from '../backend/routes/ledger/sync/route.ts';
import * as RazorpayOrder from '../backend/routes/razorpay/order/route.ts';
import * as RazorpayVerify from '../backend/routes/razorpay/verify/route.ts';
import * as RazorpayWebhook from '../backend/routes/razorpay/webhook/route.ts';
import * as SuggestNarration from '../backend/routes/suggest-narration/route.ts';
import * as WhatsappSend from '../backend/routes/whatsapp/send/route.ts';
import * as ReportsRender from '../backend/routes/reports/render/route.ts';

const app = express();

const allowedOrigins = [
  'https://www.rupeeledgerpro.com',
  'https://rupeeledgerpro.com',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || 
                      /^https:\/\/v0-indian-payroll-website-.*\.vercel\.app$/.test(origin);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "capacitor://localhost", "http://localhost"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com"],
      connectSrc: [
        "'self'", 
        "capacitor://localhost",
        "http://localhost",
        "http://localhost:*",
        "https://*.supabase.co", 
        "https://api.razorpay.com", 
        "https://www.rupeeledgerpro.com",
        "https://v0-indian-payroll-website-*.vercel.app"
      ],
      frameSrc: ["'self'", "https://api.razorpay.com", "https://otpservice.razorpay.com"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co", "capacitor://localhost", "http://localhost"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());

// Adapter to convert Express request to standard Request, and standard Response to Express response
async function nextHandler(req: express.Request, res: express.Response, handler: any) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.originalUrl}`;
    
    const headers = new Headers();
    for (const key in req.headers) {
      if (req.headers[key]) headers.append(key, req.headers[key] as string);
    }
    
    const init: RequestInit = {
      method: req.method,
      headers,
    };
    
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      init.body = JSON.stringify(req.body);
    }
    
    const webReq = new Request(url, init);
    const webRes: Response = await handler(webReq);
    
    res.status(webRes.status);
    webRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    if (webRes.body) {
      const contentType = webRes.headers.get('content-type') || '';
      if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
        const arrayBuffer = await webRes.arrayBuffer();
        res.end(Buffer.from(arrayBuffer));
      } else {
        const text = await webRes.text();
        res.send(text);
      }
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const routes = [
  { path: '/api/auth/email-otp', module: AuthEmailOtp },
  { path: '/api/auth/phone-otp', module: AuthPhoneOtp },
  { path: '/api/auth/whatsapp-otp', module: AuthWhatsappOtp },
  { path: '/api/erp/inventory', module: ErpInventory },
  { path: '/api/erp/master', module: ErpMaster },
  { path: '/api/erp/transactions', module: ErpTransactions },
  { path: '/api/keys', module: Keys },
  { path: '/api/ledger/sync', module: LedgerSync },
  { path: '/api/razorpay/order', module: RazorpayOrder },
  { path: '/api/razorpay/verify', module: RazorpayVerify },
  { path: '/api/razorpay/webhook', module: RazorpayWebhook },
  { path: '/api/reports/render', module: ReportsRender },
  { path: '/api/suggest-narration', module: SuggestNarration },
  { path: '/api/whatsapp/send', module: WhatsappSend },
];

routes.forEach(route => {
  app.all(route.path, (req, res) => {
    const method = req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    const handler = (route.module as any)[method];
    if (handler) {
      nextHandler(req, res, handler);
    } else {
      res.status(405).json({ error: 'Method Not Allowed' });
    }
  });
});

export default app;
