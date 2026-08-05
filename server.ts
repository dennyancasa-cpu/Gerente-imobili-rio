import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Readable } from "stream";
import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let filename = '';
let dirname = '';
if (typeof __filename !== 'undefined') {
  filename = __filename;
  dirname = __dirname;
} else {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    // @ts-ignore
    filename = fileURLToPath(import.meta.url);
    dirname = path.dirname(filename);
  }
}

// Load Firebase Config
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  }
} catch (e) {
  console.error('Error loading firebase-applet-config.json:', e);
}

// Initialize Firebase Admin
let adminApp: App | null = null;
let db: any = null;

try {
  const preferredProjectId = firebaseConfig.projectId;
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const sa = saRaw ? JSON.parse(saRaw) : null;
  const saProjectId = sa?.project_id;
  
  const finalProjectId = preferredProjectId || saProjectId;
  
  console.log(`[Firebase Admin] Planning init. Config Project: ${preferredProjectId}, SA Project: ${saProjectId}, Final: ${finalProjectId}`);
  
  const adminConfig: any = {
    projectId: finalProjectId
  };

  if (sa) {
    adminConfig.credential = cert(sa);
  }

  // Use a unique name for this app to avoid conflicts with platform-default apps
  // that might have different credentials or project scopes.
  const appName = `imobi-admin-${finalProjectId || 'default'}`;
  
  const existingApps = getApps();
  const existingApp = existingApps.find(a => a.name === appName);
  
  if (existingApp) {
    adminApp = existingApp;
    console.log(`[Firebase Admin] Using existing app instance: ${appName}`);
  } else {
    adminApp = initializeApp(adminConfig, appName);
    console.log(`[Firebase Admin] Initialized new app instance: ${appName}`);
  }

  // Firestore instance retrieval
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  if (adminApp) {
    db = getFirestore(adminApp, databaseId);
    console.log(`[Firestore] Initialized instance for DB: ${databaseId} (Project: ${adminApp.options.projectId})`);
    
    // Immediate Health Check
    (async () => {
      try {
        console.log(`[Firestore] Testing Admin write on ${databaseId}...`);
        await db.collection('_health').doc('admin_ping').set({ 
          last_ping: FieldValue.serverTimestamp(),
          env: process.env.NODE_ENV || 'development',
          projectId: finalProjectId,
          databaseId: databaseId
        });
        console.log(`[Firestore] SUCCESS: Admin write verified on ${databaseId}`);
      } catch (err: any) {
        console.warn(`[Firestore] WARNING: Admin write FAILED on ${databaseId}. Application will continue in limited mode. Error: ${err.message}`);
        
        // Try fallback to '(default)' if we were using a custom ID
        if (databaseId !== '(default)') {
           console.log('[Firestore] Checking if (default) database is accessible as fallback...');
           try {
             const fallbackDb = getFirestore(adminApp!, '(default)');
             await fallbackDb.collection('_health').doc('admin_ping').set({ last_ping: FieldValue.serverTimestamp() });
             db = fallbackDb;
             console.log('[Firestore] FALLBACK SUCCESS: Switch to (default) database complete.');
           } catch (defaultErr: any) {
             console.warn('[Firestore] FALLBACK FAILED: (default) database also inaccessible. IAM/Project issue likely. Root: ' + defaultErr.message);
           }
        }
      }
    })();
  }
} catch (e: any) {
  console.error('[Firebase Admin] Global Initialization Error:', e.message || e);
}

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'imobi-manager-persistent-secret-v3',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  name: 'imobimanager_sid',
  rolling: true,
  cookie: { 
    secure: true, 
    sameSite: 'none',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    partitioned: true // Try to enable CHIPS for better iframe support
  } as any
}));

// Debug middleware to log session info
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/google')) {
    console.log(`[Session Debug] Path: ${req.path}, ID: ${req.sessionID}, HasTokens: ${!!(req.session as any).tokens}`);
  }
  next();
});

// Google OAuth setup
const getRedirectUri = () => {
  return process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_U || (process.env.APP_URL ? 
    `${(process.env.APP_URL.startsWith('http') ? process.env.APP_URL : `https://${process.env.APP_URL}`).replace(/\/$/, '')}/auth/callback` : 
    'http://localhost:3000/auth/callback');
};

const createOAuthClient = (req?: any, defaultTokens?: any) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SEC,
    getRedirectUri()
  );

  if (defaultTokens) {
    client.setCredentials(defaultTokens);
  }

  if (req) {
    client.on('tokens', (newTokens) => {
      console.log('[OAuth2] Tokens event fired! Refreshing session tokens.');
      const currentSessionTokens = (req.session as any)?.tokens || defaultTokens || {};
      const updatedTokens = {
        ...currentSessionTokens,
        ...newTokens
      };
      (req.session as any).tokens = updatedTokens;
      req.session.save((err) => {
        if (err) console.error('[OAuth2] Error saving session tokens:', err);
      });
    });
  }

  return client;
};

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
];

// API Routes

// Explicitly serve manifest.json to avoid syntax errors if vite middleware misses it or serves HTML
app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
  const filePath = path.join(process.cwd(), 'public', 'manifest.json');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(filePath);
  }
  res.status(404).json({ error: 'Manifest not found' });
});

app.get('/sw.js', (req, res) => {
  const filePath = path.join(process.cwd(), 'public', 'sw.js');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(filePath);
  }
  res.status(404).send('Service Worker not found');
});

app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SEC;

  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth credentials');
    return res.status(500).json({ error: 'Google OAuth credentials not configured in environment variables (GOOGLE_CLIENT_ID/SECRET).' });
  }

  const clientRedirectUri = req.query.redirectUri as string || getRedirectUri();

  const client = createOAuthClient();
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    redirect_uri: clientRedirectUri,
    state: JSON.stringify({ redirectUri: clientRedirectUri })
  });
  res.json({ url: authUrl });
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, error: queryError } = req.query;
  
  if (queryError) {
    console.error('OAuth error from Google:', queryError);
    return res.status(400).send(`Erro do Google: ${queryError}`);
  }

  // Recover the redirect URI from the state parameter
  let currentRedirectUri = getRedirectUri();
  try {
    if (state) {
      const stateData = JSON.parse(state as string);
      if (stateData.redirectUri) {
        currentRedirectUri = stateData.redirectUri;
      }
    }
  } catch (e) {
    console.warn('Could not parse OAuth state, falling back to default redirect URI');
  }

  console.log('Auth callback received. Using redirect URI for exchange:', currentRedirectUri);

  try {
    if (!code) {
      throw new Error('Nenhum código de autorização recebido do Google.');
    }

    // Create a temporary client with the correct redirect URI for this specific exchange
    const tempClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SEC,
      currentRedirectUri
    );

    const { tokens } = await tempClient.getToken(code as string);
    console.log('Tokens received successfully');
    // Store tokens in session
    (req.session as any).tokens = tokens;
    
    // Force session save before responding
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).send('Erro ao salvar sessão de login.');
      }
      
      const tokensJson = JSON.stringify(tokens);
      
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
            <script>
              try {
                if (window.opener) {
                  // Send tokens back to parent window to ensure session synchronization
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    tokens: ${tokensJson} 
                  }, '*');
                  
                  setTimeout(() => window.close(), 1500);
                } else {
                  window.location.href = '/';
                }
              } catch (e) {
                console.error('Error in postMessage:', e);
                window.location.href = '/';
              }
            </script>
            <div style="background: white; padding: 2rem; border-radius: 1.5rem; shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center; border: 1px solid #e2e8f0;">
              <div style="width: 64px; height: 64px; background: #ecfdf5; color: #10b981; border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2 style="color: #0f172a; margin: 0 0 0.5rem 0;">Conectado com Sucesso!</h2>
              <p style="color: #64748b; margin: 0;">Sincronizando conexão...</p>
              <p style="color: #94a3b8; font-size: 0.75rem; margin-top: 1rem;">Esta janela fechará em instantes.</p>
            </div>
          </body>
        </html>
      `);
    });
  } catch (error: any) {
    console.error('Error exchanging code for tokens:', error);
    const errorMsg = error.response?.data?.error_description || error.message || 'Erro desconhecido';
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fef2f2;">
          <div style="background: white; padding: 2rem; border-radius: 1.5rem; text-align: center; border: 1px solid #fee2e2; max-width: 400px;">
            <div style="width: 64px; height: 64px; background: #fef2f2; color: #ef4444; border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 style="color: #991b1b; margin: 0 0 0.5rem 0;">Falha na Autenticação</h2>
            <p style="color: #b91c1c; font-size: 0.875rem; margin-bottom: 1rem;">${errorMsg}</p>
            <div style="text-align: left; background: #f8fafc; padding: 1rem; border-radius: 0.75rem; font-size: 0.75rem; color: #64748b; border: 1px solid #e2e8f0;">
              <strong>Dica:</strong> Verifique se o link <b>${currentRedirectUri}</b> está cadastrado no Google Cloud Console.
            </div>
            <button onclick="window.close()" style="margin-top: 1.5rem; background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer;">Fechar Janela</button>
          </div>
        </body>
      </html>
    `);
  }
});

app.post('/api/auth/google/save-tokens', async (req, res) => {
  const { tokens, uid } = req.body;
  if (!tokens) {
    return res.status(400).json({ error: 'Tokens missing' });
  }
  
  console.log(`[Token Bridge] Saving tokens. UID: ${uid || 'N/A'}, Session: ${req.sessionID}`);
  (req.session as any).tokens = tokens;
  
  let firestoreSaved = false;
  
  req.session.save((err) => {
    if (err) {
      console.error('Error saving tokens to session:', err);
      return res.status(500).json({ error: 'Failed to save session' });
    }
    console.log(`[Token Bridge] Session saved successfully. HasTokens: ${!!(req.session as any).tokens}`);
    res.json({ success: true, firestoreSaved, sessionId: req.sessionID });
  });
});

app.get(['/api/auth/google/status', '/api/auth/google/status/'], async (req, res) => {
  try {
    let tokens = (req.session as any).tokens;
    const headerTokens = req.headers['x-drive-tokens'];
    const uid = req.query.uid as string;
    let source = 'session';
    let errorDetail = null;

    // Use header tokens if session is flaky
    if (!tokens && headerTokens) {
      try {
        tokens = JSON.parse(headerTokens as string);
        (req.session as any).tokens = tokens;
        source = 'header';
        console.log('[Status Check] Tokens retrieved from X-Drive-Tokens header');
      } catch (e) {
        console.error('[Status Check] Error parsing header tokens');
      }
    }



    const sessionID = req.sessionID;
    console.log('[Status Check] SessionID:', sessionID, 'Tokens:', !!tokens, 'Source:', source);
    
    // Ensure we return JSON
    res.setHeader('Content-Type', 'application/json');
    res.json({ 
      connected: !!tokens,
      sessionId: sessionID,
      hasTokensInSession: !!(req.session as any).tokens,
      source,
      errorDetail,
      uidSent: uid,
      timestamp: new Date().toISOString()
    });
  } catch (globalError: any) {
    console.error('[Status Check] Global Critical Error:', globalError);
    res.status(500).json({ error: 'Internal Server Error in status check', details: globalError.message });
  }
});

app.get(['/api/auth/google/diagnostics', '/api/auth/google/diagnostics/'], (req, res) => {
  res.json({
    env: {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasAppUrl: !!process.env.APP_URL,
      redirectUri: getRedirectUri(),
      nodeEnv: process.env.NODE_ENV
    },
    session: {
      id: req.sessionID,
      cookie: req.session.cookie
    }
  });
});

app.post('/api/drive/upload', async (req, res) => {
  let tokens = (req.session as any).tokens;
  const headerTokens = req.headers['x-drive-tokens'];
  const { fileName, fileData, mimeType, folderName, uid } = req.body;

  // Use header tokens if session is flaky
  if (!tokens && headerTokens) {
    try {
      tokens = JSON.parse(headerTokens as string);
      (req.session as any).tokens = tokens;
      console.log('[Upload] Tokens retrieved from X-Drive-Tokens header');
    } catch (e) {
      console.error('[Upload] Error parsing header tokens');
    }
  }



  if (!tokens) {
    return res.status(401).json({ error: 'Google Drive not connected' });
  }

  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'Missing file data' });
  }

  try {
    const client = createOAuthClient(req, tokens);
    const drive = google.drive({ version: 'v3', auth: client });

    // 1. Find or create the root folder (ImobiManager)
    const rootFolderName = 'ImobiManager';
    let rootFolderId = '';
    const rootFolderResponse = await drive.files.list({
      q: `name = '${rootFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
    });

    if (rootFolderResponse.data.files && rootFolderResponse.data.files.length > 0) {
      rootFolderId = rootFolderResponse.data.files[0].id!;
    } else {
      const rootFolder = await drive.files.create({
        requestBody: {
          name: rootFolderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      rootFolderId = rootFolder.data.id!;
    }

    // 2. Find or create the subfolder (e.g., Tenant Name) inside the root folder
    let targetFolderId = rootFolderId;
    if (folderName) {
      const subFolderResponse = await drive.files.list({
        q: `name = '${folderName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
      });

      if (subFolderResponse.data.files && subFolderResponse.data.files.length > 0) {
        targetFolderId = subFolderResponse.data.files[0].id!;
      } else {
        const subFolder = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [rootFolderId],
          },
          fields: 'id',
        });
        targetFolderId = subFolder.data.id!;
      }
    }

    // 3. Upload the file to the target folder
    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId],
    };

    // Convert base64 to stream or buffer
    const buffer = Buffer.from(fileData.split(',')[1], 'base64');
    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: Readable.from(buffer),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink, thumbnailLink',
    });

    // 3. Make the file public (optional, but needed if we want to view it without auth)
    // This allows the thumbnail to be viewed in the app without auth issues.
    try {
      await drive.permissions.create({
        fileId: file.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError) {
      console.warn('Could not set public permissions:', permError);
    }

    res.json({ 
      fileId: file.data.id, 
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink,
      thumbnailLink: file.data.thumbnailLink
    });
  } catch (error: any) {
    const isAuthError = 
      error.status === 401 || 
      error.response?.status === 401 ||
      (error.message && (
        error.message.includes('credentials') || 
        error.message.includes('auth') || 
        error.message.includes('token') || 
        error.message.includes('expired') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('invalid')
      ));

    if (isAuthError) {
      // Intentionally not logging the full error string to avoid triggering error monitors
      // for expected session expirations.
      return res.status(401).json({ error: 'Google Drive credentials expired or invalid. Please reconnect.' });
    }
    console.error('Error uploading to Drive:', error.message || error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/tenant/login', async (req, res) => {
  try {
    const { cpf, password } = req.body;
    if (!cpf || !password) {
      return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
    }

    // Clean CPF (remove dots, dashes, spaces)
    const cleanCpf = cpf.replace(/\D/g, '');

    // Get all tenants in database to avoid case-sensitivity and check clean'ed CPFs
    const tenantsSnap = await db.collection('tenants').get();
    let matchedTenant: any = null;
    let tenantId = '';

    for (const doc of tenantsSnap.docs) {
      const data = doc.data();
      const dbCpf = (data.cpf || '').replace(/\D/g, '');
      if (dbCpf === cleanCpf) {
        matchedTenant = data;
        tenantId = doc.id;
        break;
      }
    }

    if (!matchedTenant) {
      return res.status(401).json({ error: 'Inquilino não encontrado com este CPF.' });
    }

    const storedPassword = matchedTenant.accessPassword || matchedTenant.password;
    if (!storedPassword) {
      return res.status(401).json({ error: 'Senha de acesso não configurada. Solicite ao seu gerente de imóveis.' });
    }

    if (storedPassword !== password) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    // Success! Fetch related contract(s) & payment records for this tenant
    const paymentsSnap = await db.collection('payments').where('tenantId', '==', tenantId).get();
    const payments = paymentsSnap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Find custom property name
    let propertyName = 'Imóvel';
    if (matchedTenant.propertyId) {
      const propDoc = await db.collection('properties').doc(matchedTenant.propertyId).get();
      if (propDoc.exists) {
        propertyName = propDoc.data().name || 'Imóvel';
      }
    }

    // Return filtered safe, non-sensitive tenant identity info
    const firstName = matchedTenant.name ? matchedTenant.name.split(' ')[0] : 'Inquilino';

    res.json({
      success: true,
      tenantId,
      tenantName: firstName,
      propertyName,
      payments: payments.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        paidAmount: p.paidAmount || 0,
        dueDate: p.dueDate,
        paidDate: p.paidDate || null,
        status: p.status, // "pending", "paid", "late", etc
        type: p.type || 'rent',
        description: p.description || ''
      }))
    });
  } catch (err: any) {
    console.error('Error on tenant login API:', err);
    res.status(500).json({ error: 'Erro interno no servidor: ' + err.message });
  }
});

app.post('/api/auth/google/logout', async (req, res) => {
  const uid = req.body.uid;
  (req.session as any).tokens = null;

  req.session.save(() => {
    res.json({ success: true });
  });
});

app.get(['/api/drive/test', '/api/drive/test/'], async (req, res) => {
  let tokens = (req.session as any).tokens;
  const headerTokens = req.headers['x-drive-tokens'];
  const uid = req.query.uid as string;

  // Use header tokens if session is flaky
  if (!tokens && headerTokens) {
    try {
      tokens = JSON.parse(headerTokens as string);
      (req.session as any).tokens = tokens;
      console.log('[Test] Tokens retrieved from X-Drive-Tokens header');
    } catch (e) {
      console.error('[Test] Error parsing header tokens');
    }
  }



  if (!tokens) {
    return res.status(401).json({ connected: false, error: 'Não conectado (sem tokens na sessão)' });
  }

  try {
    const client = createOAuthClient(req, tokens);
    const drive = google.drive({ version: 'v3', auth: client });
    
    // Test by getting user info
    const response = await drive.about.get({ fields: 'user, storageQuota' });
    
    res.json({ 
      connected: true, 
      user: response.data.user,
      storageQuota: response.data.storageQuota,
      tokens: (req.session as any).tokens
    });
  } catch (error: any) {
    const isAuthError = 
      error.status === 401 || 
      error.response?.status === 401 ||
      (error.message && (
        error.message.includes('credentials') || 
        error.message.includes('auth') || 
        error.message.includes('token') || 
        error.message.includes('expired') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('invalid')
      ));

    if (isAuthError) {
      // Intentionally not logging the full error string to avoid triggering error monitors
      // for expected session expirations.
      return res.status(401).json({ connected: false, error: 'Google Drive credentials expired or invalid. Please reconnect.' });
    }
    console.error('Drive test failed:', error.message || error);
    res.status(500).json({ 
      connected: false, 
      error: error.message || 'Erro ao testar conexão com o Drive' 
    });
  }
});

// Google Tasks Proxy API Endpoints
app.get('/api/tasks/lists', async (req, res) => {
  let tokens = (req.session as any).tokens;
  const headerTokens = req.headers['x-drive-tokens'];
  if (!tokens && headerTokens) {
    try { tokens = JSON.parse(headerTokens as string); } catch (e) {}
  }
  if (!tokens) return res.status(401).json({ error: 'Google Account not connected' });

  try {
    const client = createOAuthClient(req, tokens);
    const tasksApi = google.tasks({ version: 'v1', auth: client });
    const response = await tasksApi.tasklists.list();
    res.json(response.data);
  } catch (err: any) {
    console.error('Error listing task lists:', err.message);
    res.status(500).json({ error: err.message || 'Failed to list task lists' });
  }
});

app.get('/api/tasks/lists/:listId/tasks', async (req, res) => {
  let tokens = (req.session as any).tokens;
  const headerTokens = req.headers['x-drive-tokens'];
  if (!tokens && headerTokens) {
    try { tokens = JSON.parse(headerTokens as string); } catch (e) {}
  }
  if (!tokens) return res.status(401).json({ error: 'Google Account not connected' });

  try {
    const client = createOAuthClient(req, tokens);
    const tasksApi = google.tasks({ version: 'v1', auth: client });
    const response = await tasksApi.tasks.list({
      tasklist: req.params.listId || '@default',
      showCompleted: true,
      showHidden: true,
    });
    res.json(response.data);
  } catch (err: any) {
    console.error('Error listing tasks:', err.message);
    res.status(500).json({ error: err.message || 'Failed to list tasks' });
  }
});

app.post('/api/tasks/lists/:listId/tasks', async (req, res) => {
  let tokens = (req.session as any).tokens;
  const headerTokens = req.headers['x-drive-tokens'];
  if (!tokens && headerTokens) {
    try { tokens = JSON.parse(headerTokens as string); } catch (e) {}
  }
  if (!tokens) return res.status(401).json({ error: 'Google Account not connected' });

  try {
    const client = createOAuthClient(req, tokens);
    const tasksApi = google.tasks({ version: 'v1', auth: client });
    const { title, notes, due } = req.body;
    const taskBody: any = { title, notes };
    if (due) taskBody.due = new Date(due).toISOString();

    const response = await tasksApi.tasks.insert({
      tasklist: req.params.listId || '@default',
      requestBody: taskBody,
    });
    res.json(response.data);
  } catch (err: any) {
    console.error('Error creating task:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create task' });
  }
});

app.patch('/api/tasks/lists/:listId/tasks/:taskId', async (req, res) => {
  let tokens = (req.session as any).tokens;
  const headerTokens = req.headers['x-drive-tokens'];
  if (!tokens && headerTokens) {
    try { tokens = JSON.parse(headerTokens as string); } catch (e) {}
  }
  if (!tokens) return res.status(401).json({ error: 'Google Account not connected' });

  try {
    const client = createOAuthClient(req, tokens);
    const tasksApi = google.tasks({ version: 'v1', auth: client });
    const response = await tasksApi.tasks.patch({
      tasklist: req.params.listId || '@default',
      task: req.params.taskId,
      requestBody: req.body,
    });
    res.json(response.data);
  } catch (err: any) {
    console.error('Error updating task:', err.message);
    res.status(500).json({ error: err.message || 'Failed to update task' });
  }
});

app.delete('/api/tasks/lists/:listId/tasks/:taskId', async (req, res) => {
  let tokens = (req.session as any).tokens;
  const headerTokens = req.headers['x-drive-tokens'];
  if (!tokens && headerTokens) {
    try { tokens = JSON.parse(headerTokens as string); } catch (e) {}
  }
  if (!tokens) return res.status(401).json({ error: 'Google Account not connected' });

  try {
    const client = createOAuthClient(req, tokens);
    const tasksApi = google.tasks({ version: 'v1', auth: client });
    await tasksApi.tasks.delete({
      tasklist: req.params.listId || '@default',
      task: req.params.taskId,
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting task:', err.message);
    res.status(500).json({ error: err.message || 'Failed to delete task' });
  }
});

// Vite middleware for development
async function startServer() {
  let isReady = false;

  // Temporary middleware to hold requests until Vite (or static) is ready
  app.use((req, res, next) => {
    if (isReady) return next();
    
    // If it's a page request, send a nice loading screen
    // Using 503 prevents the Service Worker from caching this temporary screen
    if (req.accepts('html')) {
      res.status(503).send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Iniciando...</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; }
            .loader { border: 4px solid rgba(255,255,255,0.1); border-left-color: #6366f1; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 1rem; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
          <script>
            // Refresh automatically when ready
            setInterval(() => {
              fetch('/api/health').then(r => { if (r.ok) window.location.reload(); });
            }, 1000);
          </script>
        </head>
        <body>
          <div class="loader"></div>
          <h2>Preparando ambiente...</h2>
          <p style="color: #94a3b8; font-size: 14px;">Isso leva apenas alguns segundos.</p>
        </body>
        </html>
      `);
    } else {
      // For assets/api, just wait
      const check = setInterval(() => {
        if (isReady) {
          clearInterval(check);
          next();
        }
      }, 100);
    }
  });

  // Health endpoint for the loading screen to poll
  app.get('/api/health', (req, res) => {
    if (isReady) res.json({ status: 'ok' });
    else res.status(503).json({ status: 'starting' });
  });

  // Bind port immediately so the proxy can connect and avoid showing the "Please wait" page
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    isReady = true;
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    isReady = true;
  }
}

startServer().catch(console.error);
