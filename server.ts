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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
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

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SEC,
  getRedirectUri()
);

console.log('Google Redirect URI:', getRedirectUri());

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// API Routes

// Explicitly serve manifest.json to avoid syntax errors if vite middleware misses it or serves HTML
app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
  const filePath = path.join(process.cwd(), 'public', 'manifest.json');
  console.log('[Manifest] Request received. Resolving to:', filePath);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.sendFile(filePath);
  }
  
  // Alternative path
  const altPath = path.join(process.cwd(), 'manifest.json');
  if (fs.existsSync(altPath)) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.sendFile(altPath);
  }

  console.warn('[Manifest] Not found in public or root');
  res.status(404).json({ error: 'Manifest not found' });
});

app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SEC;

  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth credentials');
    return res.status(500).json({ error: 'Google OAuth credentials not configured in environment variables (GOOGLE_CLIENT_ID/SECRET).' });
  }

  const clientRedirectUri = req.query.redirectUri as string || getRedirectUri();

  const authUrl = oauth2Client.generateAuthUrl({
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
  // Save to Firestore as permanent fallback if UID provided
  if (uid && db) {
    try {
      await db.collection('config').doc(uid).set({
        googleDriveTokens: JSON.stringify(tokens),
        googleDriveConnected: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firestore Sync] Tokens saved permanently for UID: ${uid}`);
      firestoreSaved = true;
    } catch (e: any) {
      console.error(`[Firestore Sync] Error saving tokens for UID ${uid}:`, e);
      // We don't fail the whole request because session saving might still work
    }
  }
  
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

    // Use header tokens as top priority if session is flaky
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

    // Fallback to Firestore if session and header are missing but UID is present
    if (!tokens && uid && db) {
      const dbDetails = (db as any)._databaseId ? ` [DB: ${(db as any)._databaseId}]` : '';
      console.log(`[Status Check] Tokens missing in session, attempting Firestore fallback for UID: ${uid}${dbDetails}`);
      try {
        const configDoc = await db.collection('config').doc(uid).get();
        if (configDoc.exists) {
          const data = configDoc.data();
          if (data?.googleDriveTokens) {
            tokens = JSON.parse(data.googleDriveTokens);
            (req.session as any).tokens = tokens; // Restore session
            source = 'firestore';
            console.log(`[Status Check] Tokens restored from Firestore for UID: ${uid}`);
          } else {
            console.log(`[Status Check] Config doc exists but no googleDriveTokens for UID: ${uid}`);
          }
        } else {
          console.log(`[Status Check] Config doc does not exist for UID: ${uid}`);
        }
      } catch (e: any) {
        errorDetail = e.message || e;
        console.error(`[Status Check] Firestore fallback error:`, errorDetail, dbDetails);
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

  // Use header tokens as top priority if session is flaky
  if (!tokens && headerTokens) {
    try {
      tokens = JSON.parse(headerTokens as string);
      (req.session as any).tokens = tokens;
      console.log('[Upload] Tokens retrieved from X-Drive-Tokens header');
    } catch (e) {
      console.error('[Upload] Error parsing header tokens');
    }
  }

  // Fallback to Firestore for upload if tokens missing in session
  if (!tokens && uid && db) {
    const dbDetails = (db as any)._databaseId ? ` [DB: ${(db as any)._databaseId}]` : '';
    console.log(`[Upload] Tokens missing, attempting Firestore fallback for UID: ${uid}${dbDetails}`);
    try {
      const configDoc = await db.collection('config').doc(uid).get();
      if (configDoc.exists) {
        const data = configDoc.data();
        if (data?.googleDriveTokens) {
          tokens = JSON.parse(data.googleDriveTokens);
          (req.session as any).tokens = tokens;
          console.log(`[Upload] Tokens recovered from Firestore for UID: ${uid}`);
        }
      }
    } catch (e: any) {
      console.error(`[Upload Fallback] Firestore error: ${e.message || e}${dbDetails}`);
    }
  }

  if (!tokens) {
    return res.status(401).json({ error: 'Google Drive not connected' });
  }

  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'Missing file data' });
  }

  try {
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

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
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/auth/google/logout', async (req, res) => {
  const uid = req.body.uid;
  (req.session as any).tokens = null;

  if (uid && db) {
    try {
      await db.collection('config').doc(uid).set({
        googleDriveTokens: null,
        googleDriveConnected: false,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Error removing tokens from Firestore:', e);
    }
  }

  req.session.save(() => {
    res.json({ success: true });
  });
});

app.get(['/api/drive/test', '/api/drive/test/'], async (req, res) => {
  let tokens = (req.session as any).tokens;
  const headerTokens = req.headers['x-drive-tokens'];
  const uid = req.query.uid as string;

  // Use header tokens as top priority if session is flaky
  if (!tokens && headerTokens) {
    try {
      tokens = JSON.parse(headerTokens as string);
      (req.session as any).tokens = tokens;
      console.log('[Test] Tokens retrieved from X-Drive-Tokens header');
    } catch (e) {
      console.error('[Test] Error parsing header tokens');
    }
  }

  if (!tokens && uid && db) {
    try {
      const configDoc = await db.collection('config').doc(uid).get();
      if (configDoc.exists) {
        const data = configDoc.data();
        if (data?.googleDriveTokens) {
          tokens = JSON.parse(data.googleDriveTokens);
          (req.session as any).tokens = tokens;
        }
      }
    } catch (e) {
      console.error('[Test Fallback] Firestore error:', e);
    }
  }

  if (!tokens) {
    return res.status(401).json({ connected: false, error: 'Não conectado (sem tokens na sessão)' });
  }

  try {
    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Test by getting user info
    const response = await drive.about.get({ fields: 'user, storageQuota' });
    
    res.json({ 
      connected: true, 
      user: response.data.user,
      storageQuota: response.data.storageQuota
    });
  } catch (error: any) {
    console.error('Drive test failed:', error);
    res.status(500).json({ 
      connected: false, 
      error: error.message || 'Erro ao testar conexão com o Drive' 
    });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { history, message } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Chave da API do Google Gemini não configurada no servidor.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemInstruction = `Você é o Agente de Suporte e Assistente Virtual do aplicativo 'Gerente Imobiliário'.
Sua personalidade é amigável, direta, paciente e extremamente profissional.
Sua função é tirar dúvidas de proprietários sobre como usar o aplicativo. A interface dele inclui abas: Dashboard, Recebimentos, Imóveis, Inquilinos, Financeiro, Central Cloud, Configurações, e Ajuda.
    
Manual de uso resumido (Use isso para fundamentar suas respostas):
- **O que é o App:** Uma plataforma para gerir imóveis, inquilinos, aluguéis mensais (com controle de atrasos), despesas de propriedades, e guardar contratos seguros no Google Drive.
- **Criar Imóvel:** Vá na aba "Imóveis", clique em "Novo Imóvel". Insira o nome, endereço, valor base e defina o status (Livre, Alugado ou Reforma) e dia de vencimento desejado.
- **Criar Inquilino e Anexar:** Vá na aba "Inquilinos". Clique em "Novo Inquilino". Preencha dados pessoais, telefone (Zap). Mude o status dele para "Alocado" e, assim que mudar o status, o sistema pedirá para escolher a qual Imóvel alocar.
- **Caução vs Primeiro Aluguel:** No exato momento da alocação de um Inquilino a um Imóvel (dentro do perfil do inquilino), há uma chave alternadora: "O valor inicial refere-se a: [Primeiro Aluguel] ou [Caução]". Selecione Caução para registrar que deixou mês de garantia emvez de pagar pra morar adiantado.
- **Criar Acordos:** Na aba "Financeiro", e também no botão verde das pendências, você pode escolher "Realizar Acordo". Isso renegocia várias parcelas atrasadas, cria um novo parcelamento e joga os aluguéis originais com status "Em Acordo" para a pessoa ir acompanhando e abatendo.
- **Recebimentos vs Financeiro:** Recebimentos é focado em baixar parcelas "entrando" hoje. Financeiro engloba tudo, inclusive lançar Despesas (Reformas, Pinturas) no patrimônio.
- **Cloud e Comprovantes:** Na Central Cloud, conecte a conta Google. Depois que conectar, o envio de Contrato Novo de Inquilino vai direto pro Google Drive e puxa a miniatura bonitinha aqui no app.
    
Se perguntarem algo que não saiba, guie o usuário pacientemente. Se for um bug ou comportamento estranho do sistema, sugira limpar o cache ou enviar uma mensagem pro suporte técnico geral.
Responda sempre em português.`;

    // Initialize chat session
    const chat = ai.chats.create({
      model: 'gemini-3.1-pro',
      config: {
        systemInstruction,
        temperature: 0.3
      }
    });

    // To respect the new SDK state, we have to either send the whole history manually,
    // or build a clean message representation.
    // For simplicity, we can pass formatted contents to ai.models.generateContent if history is complex, 
    // but chat.sendMessage is preferred if we don't have existing history object initialized by SDK.
    // Since we receive a standard history format from the frontend, we can map it to `Contents` objects
    // for standard unary generation, acting as a chat.
    
    const formattedContents = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro',
      contents: formattedContents,
      config: { systemInstruction, temperature: 0.4 }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
