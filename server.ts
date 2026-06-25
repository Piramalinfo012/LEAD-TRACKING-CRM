import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import streamifier from 'streamifier';
import { SheetsDB } from './src/lib/sheets.js';
import { getDriveClient } from './src/lib/google-auth.js';

// --- Server Side Caching ---
const LEADS_CACHE_TTL = 2 * 1000; // 2 seconds cache TTL for near real-time sync
const USERS_CACHE_TTL = 15 * 1000; // 15 seconds cache TTL
const MASTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

const CACHE_DIR = path.resolve('.cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const LEADS_CACHE_FILE = path.join(CACHE_DIR, 'leads.json');
const USERS_CACHE_FILE = path.join(CACHE_DIR, 'users.json');
const MASTER_CACHE_FILE = path.join(CACHE_DIR, 'master.json');

let LEADS_CACHE: any[] | null = null;
let USERS_CACHE: any[] | null = null;
let MASTER_CACHE: any[] | null = null;
let EXTRA_DATA_CACHE: { followups: any[], history: any[], techProducts: any[] } | null = null;
let LAST_FETCH_LEADS = 0;
let LAST_FETCH_USERS = 0;
let LAST_FETCH_MASTER = 0;
let LAST_FETCH_EXTRA_DATA = 0;
const EXTRA_DATA_CACHE_TTL = 30 * 1000; // 30 seconds

const formatDateForSheet = (value: any) => {
  if (!value) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${dmyMatch[3]}`;
  }

  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
  }

  return raw;
};

// Load from disk on startup
try {
  if (fs.existsSync(LEADS_CACHE_FILE)) {
    LEADS_CACHE = JSON.parse(fs.readFileSync(LEADS_CACHE_FILE, 'utf-8'));
    LAST_FETCH_LEADS = Date.now();
    console.log(`Loaded ${LEADS_CACHE?.length} leads from disk cache.`);
  }
} catch (e) {
  console.error('Failed to load leads from disk cache:', e);
}

try {
  if (fs.existsSync(USERS_CACHE_FILE)) {
    const rawUsers = JSON.parse(fs.readFileSync(USERS_CACHE_FILE, 'utf-8'));
    USERS_CACHE = rawUsers.filter((u: any) => {
      const uId = String(u.ID || u.id || '').trim();
      const uEmail = String(u.GMAIL || u.Gmail || u.email || '').trim();
      const uName = String(u['USER NAME'] || u.name || '').trim();
      return uId !== '' || uEmail !== '' || uName !== '';
    });
    LAST_FETCH_USERS = Date.now();
    console.log(`Loaded ${USERS_CACHE?.length} users from disk cache.`);
  }
} catch (e) {
  console.error('Failed to load users from disk cache:', e);
}

try {
  if (fs.existsSync(MASTER_CACHE_FILE)) {
    const rawMaster = JSON.parse(fs.readFileSync(MASTER_CACHE_FILE, 'utf-8'));
    MASTER_CACHE = rawMaster.filter((row: any) => {
      return Object.values(row).some(val => val !== undefined && String(val).trim() !== '');
    });
    LAST_FETCH_MASTER = Date.now();
    console.log(`Loaded ${MASTER_CACHE?.length} master records from disk cache.`);
  }
} catch (e) {
  console.error('Failed to load master records from disk cache:', e);
}

let activeLeadsFetchPromise: Promise<any[]> | null = null;
let activeUsersFetchPromise: Promise<any[]> | null = null;
let activeMasterFetchPromise: Promise<any[]> | null = null;
let activeExtraDataFetchPromise: Promise<any> | null = null;

const normalizeLeadId = (value: any) => String(value ?? '').trim().toLowerCase();

const normalizePipelineStage = (value: any) => {
  const stage = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (stage === 'TECH') return 'TECHNICAL_DISCUSSION';
  const allowedStages = new Set([
    'COLD',
    'LEAD',
    'MEETING',
    'SAMPLE',
    'TECHNICAL_DISCUSSION',
    'NEGOTIATION',
    'ORDER',
    'CLOSED',
  ]);
  return allowedStages.has(stage) ? stage : 'COLD';
};

const isDeletedMarker = (value: any) => {
  const marker = String(value ?? '').trim().toLowerCase();
  return marker === 'deleted' || marker === 'true' || marker === 'yes' || marker === '1';
};

const getDeletedIdFromRow = (row: any) => {
  const candidates = [
    row.Id, row.ID, row.id, row['Lead ID'], row['Lead Id'], row.LeadID, 
    row.DELETE, row.Delete, row.delete, row.__col_0, row.__col_1
  ];

  for (const candidate of candidates) {
    const id = normalizeLeadId(candidate);
    if (id && id !== 'id' && id !== 'delete' && id !== 'deleted') return { id, row };
  }
  return null;
};

async function doExtraDataFetch() {
  const now = Date.now();
  console.log('Refreshing Extra Data Cache from Sheets...');
  try {
    // Increase timeout to 25000 to prevent AbortError
    const [followups, history, techProducts] = await Promise.all([
      SheetsDB.getRows('Followups', undefined, 0, 25000).catch(() => []),
      SheetsDB.getRows('Reschedule', undefined, 0, 25000).catch(() => []),
      SheetsDB.getRows('Prodcut Negotiation', undefined, 0, 25000).catch(() => []),
    ]);
    EXTRA_DATA_CACHE = { followups, history, techProducts };
    LAST_FETCH_EXTRA_DATA = now;
    return EXTRA_DATA_CACHE;
  } catch (err) {
    console.error("Failed to fetch Extra Data", err);
    throw err;
  }
}

async function refreshExtraDataCache(force = false) {
  const now = Date.now();
  
  if (force) {
    if (!activeExtraDataFetchPromise) {
      activeExtraDataFetchPromise = doExtraDataFetch().finally(() => {
        activeExtraDataFetchPromise = null;
      });
    }
    return activeExtraDataFetchPromise;
  }

  // Stale-While-Revalidate pattern for ultra-fast UI
  if (EXTRA_DATA_CACHE) {
    if (now - LAST_FETCH_EXTRA_DATA >= EXTRA_DATA_CACHE_TTL) {
      if (!activeExtraDataFetchPromise) {
        activeExtraDataFetchPromise = doExtraDataFetch().finally(() => {
          activeExtraDataFetchPromise = null;
        });
      }
    }
    return EXTRA_DATA_CACHE;
  }

  if (!activeExtraDataFetchPromise) {
    activeExtraDataFetchPromise = doExtraDataFetch().finally(() => {
      activeExtraDataFetchPromise = null;
    });
  }
  return activeExtraDataFetchPromise;
}

const isLeadDeleted = (lead: any, deletedLeadMap: Map<string, any>) => {
  const id = normalizeLeadId(lead.id);
  const deleteValue = normalizeLeadId(lead.DELETE || lead.Delete || lead.delete);

  if (id && deletedLeadMap.has(id)) {
    const deletedRow = deletedLeadMap.get(id);
    const deletedParty = normalizeLeadId(deletedRow['Party Name']);
    const leadParty = normalizeLeadId(lead.company_name);
    
    // If party names are totally different, it means the ID was reused for a new lead
    if (!deletedParty || !leadParty || deletedParty === leadParty) {
      return true;
    }
  }

  return (
    isDeletedMarker(lead.is_deleted) ||
    isDeletedMarker(lead.delete_marker) ||
    isDeletedMarker(lead.__col_82) ||
    (id && deleteValue === id)
  );
};

async function doLeadsFetch() {
  const now = Date.now();
  console.log('Refreshing Leads Cache from Sheets (Fetch)...');
  try {
    let leads: any[] = [];
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SCRIPT_URL) {
      
      // Fetch all lead sources in parallel, then apply Deleted-sheet hiding once.
      const [fmsRows, deletedRows] = await Promise.all([
        SheetsDB.getRows('NEW_FMS', undefined, 5, 25000).catch(err => {
          console.error('NEW_FMS fetch failed during cache refresh:', err.message);
          throw err; // Throw error so we don't wipe out the cache with an empty array!
        }),
        SheetsDB.getRows('Deleted', undefined, 0, 25000).catch(err => {
          console.warn('Deleted sheet fetch failed during cache refresh:', err.message || err);
          return [];
        })
      ]);

      const deletedLeadMap = new Map<string, any>();
      (deletedRows as any[]).forEach((row: any) => {
        const result = getDeletedIdFromRow(row);
        if (result && result.id) {
          deletedLeadMap.set(result.id, result.row);
        }
      });


      const fmsLeads = fmsRows.filter((r: any) => (r.Id || r['Party Name']) && String(r.Id).trim().toLowerCase() !== 'id' && String(r['Party Name']).trim().toLowerCase() !== 'party name').map((l: any, index: number) => {
        const companyName = l['Party Name'] || '';
        const mobile = l['Mobile No. '] || l['Mobile No.'] || '';
        const stableId = l['Id'] || `FMS-${index}-${companyName.replace(/\s+/g, '')}-${mobile}`;
        
        return {
          id: stableId,
          company_name: companyName,
          contact_person: l['Person Name'] || '',
          mobile: mobile,
          email: l['Gmail ID'] || '',
          address: l['Address'] || '',
          state: l['State'] || '',
          district: l['District'] || '',
          source: l['Source'] || '',
          status: normalizePipelineStage(l['Pramoted To'] || l['Stage'] || l['stage']),
          sales_person_name: l['Sales Person Name'] || '',
          mcb_kit_url: l['MCBs. (KIT) URl'] || l['MCBs. (KIT)'] || '',
          last_remarks: l['Last Remarks'] || '',
          followup_date: l['Follow Up date'] || l['__col_13'] || '',
          'District': l['District'],
          'Follow Up date': l['Follow Up date'] || l['__col_13'] || '',
          'Source': l['Source'],
          'Party Name': l['Party Name'],
          'Person Name': l['Person Name'],
          'Mobile No. ': l['Mobile No. '] || l['Mobile No.'],
          'Gmail ID': l['Gmail ID'],
          'MCBs. (KIT) URl': l['MCBs. (KIT) URl'] || l['MCBs. (KIT)'],
          'Last Remarks': l['Last Remarks'],
          created_at: l['Timestamp'] || l['__col_0'] || '',
          updated_at: (
            l['__col_60'] || l['__col_47'] || l['__col_33'] || l['__col_24'] || l['__col_16'] || l['Timestamp'] || l['__col_0'] || ''
          ),
          owner_id: l['Sales Person Name'] || 'SYSTEM_FMS',
          is_fms: true,
          'Entry By Id': l['Entry By Id'] || '',
          entry_by_id: l['Entry By Id'] || '',
          is_deleted: l['is_deleted'] || l['Is Deleted'] || l['__col_82'] || '',
          delete_marker: l['DELETE'] || l['Delete'] || l['__col_82'] || '',
          DELETE: l['DELETE'] || l['Delete'] || '',
          __col_82: l['__col_82'] || '',
          
          // Lead Stage Fields
          lead_planned_date: l['__col_15'] || l['Lead Planned Date'] || l['planned_date'] || '',
          lead_actual_date: l['__col_16'] || l['Lead Actual Date'] || l['actual_date'] || '',
          lead_status: l['Lead Status'] || l['custom_status'] || '',
          product_details: l['Product details.'] || l['product_details'] || '',
          mcb_requirement: l['MCB according to requirement. Url'] || l['MCB according to requirement.'] || l['mcb_requirement'] || '',
          pain_points: l['__col_20'] || l['pain_points'] || '',
          kit_details: l['KIT Url'] || l['KIT.'] || l['kit_details'] || '',
          meeting_followup_date: l['Meeting Follow-up Date.'] || l['meeting_followup_date'] || '',
  
          // Meeting Stage Fields
          meeting_planned_date: l['__col_23'] || l['Meeting Planned Date'] || l['Meeting Planned'] || '',
          meeting_actual_date: l['__col_24'] || l['Meeting Actual Date'] || l['Meeting Actual'] || '',
          meeting_status: l['Meeting Status'] || '',
          reschedule_date: l['Reschedule Meeting Date'] || '',
          discussion_points: l['Discussion Points.'] || '',
          meeting_person_name: l['Meeting Person Name'] || '',
          meeting_number: l['Number'] || '',
          bullet_point_remarks: l['Bullet Point Remarks.'] || '',
          meeting_url: l['Picture of Meeting Url'] || '',

          // Technical Discussion Stage Fields
          tech_planned_date: l['__col_32'] || '',
          tech_actual_date: l['__col_33'] || '',
          tech_status: l['__col_34'] || l['Technical Status'] || '',
          tech_kit_url: l['__col_44'] || l['Kit Attachment Url'] || '',

          // Sample Stage Fields
          sample_planned_date: l['__col_73'] || l['Sample Planned Date'] || '',
          sample_actual_date: l['__col_74'] || l['Sample Actule Date'] || '',
          sample_status: l['__col_75'] || l['Sample Status'] || '',
          sample_product_name: l['__col_76'] || l['Prodcut Name'] || l['Product Name'] || '',
          sample_qty: l['__col_77'] || l['Qty'] || '',
          sample_dispatch_date: l['__col_78'] || l['Sample Dispach Date'] || '',
          sample_remark: l['__col_79'] || l['Remark If-Any'] || '',
          sample_attachment: l['__col_80'] || l['Attachment'] || '',

          // Negotiation Stage Fields
          negotiation_planned_date: l['__col_46'] || '',
          negotiation_actual_date: l['__col_47'] || '',
          negotiation_status: l['__col_48'] || l['Status'] || '',
          quotation_url: l['__col_49'] || l['Quotation Upload:'] || '',
          unit: l['__col_50'] || l['Unit'] || '',
          final_price: l['__col_51'] || l['Final Price'] || '',
          quantity: l['__col_52'] || l['Quantity,'] || '',
          payment_terms: l['__col_53'] || l['Payment Terms'] || '',
          delivery_schedule: l['__col_54'] || l['Delivery Schedule.'] || '',
          party_type: l['__col_55'] || l['Party Type classification:'] || '',
          negotiation_remark: l['__col_56'] || l['Remark if-Any'] || '',
          negotiation_kit_url: l['__col_57'] || l['Kit Attachment'] || '',

          // Order Stage Fields
          order_planned_date: l['__col_59'] || '',
          order_actual_date: l['__col_60'] || '',
          order_copy_url: l['__col_61'] || '',
          delivery_in: l['__col_62'] || '',
          unloading: l['__col_63'] || '',
          motor_pump_requirement: l['__col_64'] || '',
          transport: l['__col_65'] || '',
          order_remark: l['__col_66'] || '',
          order_attachment_url: l['__col_67'] || '',
          order_status: l['__col_68'] || '',

          // Closed Stage Fields
          closed_at: l['lead Closed date'] || l['__col_70'] || '',
          close_reason: l['Reason'] || l['__col_71'] || '',
          close_remark: l['Remark'] || l['__col_72'] || '',
        };
      });

      leads = [...fmsLeads].filter((l: any) => !isLeadDeleted(l, deletedLeadMap));
    } else {
      throw new Error('Google Sheets credentials (GOOGLE_SCRIPT_URL) are missing.');
    }
    
    // CRITICAL SAFEGUARD: Do not wipe out existing data with an empty array. 
    // If the cache was populated, and this fetch returned 0 leads (due to API glitch or bad parsing),
    // we keep the old data to prevent the UI from breaking down ("asie bitch me data show nahi hota hai").
    if (leads.length === 0 && LEADS_CACHE && LEADS_CACHE.length > 0) {
      console.warn(`[SAFEGUARD] Fetch returned 0 leads but cache has ${LEADS_CACHE.length} leads. Keeping old cache to prevent UI breakdown.`);
      LAST_FETCH_LEADS = now; // update timer so we don't spam requests
      return LEADS_CACHE;
    }

    LEADS_CACHE = leads;
    LAST_FETCH_LEADS = now;
    console.log(`Leads Cache refreshed in background: ${leads.length} leads`);
    fs.promises.writeFile(LEADS_CACHE_FILE, JSON.stringify(leads, null, 2), 'utf-8')
      .catch(err => console.error('Failed to save leads cache to disk:', err));
    return leads;
  } catch (error: any) {
    console.error('Failed to fetch and cache Leads:', error);
    if (!LEADS_CACHE) throw error;
    return LEADS_CACHE;
  }
}

async function refreshLeadsCache(force = false) {
  const now = Date.now();
  
  if (force) {
    if (!activeLeadsFetchPromise) {
      activeLeadsFetchPromise = doLeadsFetch().finally(() => {
        activeLeadsFetchPromise = null;
      });
    }
    return activeLeadsFetchPromise;
  }

  if (!force && LEADS_CACHE && now - LAST_FETCH_LEADS < LEADS_CACHE_TTL) {
    return LEADS_CACHE;
  }

  if (!activeLeadsFetchPromise) {
    activeLeadsFetchPromise = doLeadsFetch().finally(() => {
      activeLeadsFetchPromise = null;
    });
  }
  return activeLeadsFetchPromise;
}

async function doUsersFetch() {
  const now = Date.now();
  console.log('Refreshing Users Cache from Sheets (Fetch)...');
  try {
    let users = [];
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SCRIPT_URL) {
      const rawUsers = await SheetsDB.getRows('Login');
      users = rawUsers.filter((u: any) => {
        // Filter out completely blank/deleted rows
        const uId = String(u.ID || u.id || '').trim();
        const uEmail = String(u.GMAIL || u.Gmail || u.email || '').trim();
        const uName = String(u['USER NAME'] || u.name || '').trim();
        return uId !== '' || uEmail !== '' || uName !== '';
      });
    } else {
      throw new Error('Google Sheets credentials (GOOGLE_SCRIPT_URL) are missing.');
    }
    USERS_CACHE = users;
    LAST_FETCH_USERS = now;
    console.log(`Users Cache refreshed: ${users.length} users`);
    fs.promises.writeFile(USERS_CACHE_FILE, JSON.stringify(users, null, 2), 'utf-8')
      .catch(err => console.error('Failed to save users cache to disk:', err));
    return users;
  } catch (error: any) {
    console.error('Failed to fetch and cache Users:', error);
    if (!USERS_CACHE) throw error;
    return USERS_CACHE;
  }
}

async function refreshUsersCache(force = false) {
  const now = Date.now();
  
  if (force) {
    if (!activeUsersFetchPromise) {
      activeUsersFetchPromise = doUsersFetch().finally(() => {
        activeUsersFetchPromise = null;
      });
    }
    return activeUsersFetchPromise;
  }

  // Stale-While-Revalidate pattern for ultra-fast UI
  if (USERS_CACHE) {
    if (now - LAST_FETCH_USERS >= USERS_CACHE_TTL) {
      if (!activeUsersFetchPromise) {
        activeUsersFetchPromise = doUsersFetch().finally(() => {
          activeUsersFetchPromise = null;
        });
      }
    }
    return USERS_CACHE;
  }

  if (!activeUsersFetchPromise) {
    activeUsersFetchPromise = doUsersFetch().finally(() => {
      activeUsersFetchPromise = null;
    });
  }
  return activeUsersFetchPromise;
}

async function doMasterFetch() {
  const now = Date.now();
  console.log('Refreshing Master Cache from Sheets (Fetch)...');
  try {
    let data = [];
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SCRIPT_URL) {
      const rawData = await SheetsDB.getRows('Master');
      data = rawData.filter((row: any) => {
        // Filter out completely blank rows
        return Object.values(row).some(val => val !== undefined && String(val).trim() !== '');
      });
    } else {
      throw new Error('Google Sheets credentials (GOOGLE_SCRIPT_URL) are missing.');
    }
    MASTER_CACHE = data;
    LAST_FETCH_MASTER = now;
    console.log(`Master Cache refreshed: ${data.length} records`);
    fs.promises.writeFile(MASTER_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8')
      .catch(err => console.error('Failed to save master cache to disk:', err));
    return data;
  } catch (error) {
    console.error('Failed to fetch and cache Master Data:', error);
    return MASTER_CACHE || [];
  }
}

async function refreshMasterCache(force = false) {
  const now = Date.now();
  
  if (force) {
    if (!activeMasterFetchPromise) {
      activeMasterFetchPromise = doMasterFetch().finally(() => {
        activeMasterFetchPromise = null;
      });
    }
    return activeMasterFetchPromise;
  }

  // Stale-While-Revalidate pattern for ultra-fast UI
  if (MASTER_CACHE) {
    if (now - LAST_FETCH_MASTER >= MASTER_CACHE_TTL) {
      if (!activeMasterFetchPromise) {
        activeMasterFetchPromise = doMasterFetch().finally(() => {
          activeMasterFetchPromise = null;
        });
      }
    }
    return MASTER_CACHE;
  }

  if (!activeMasterFetchPromise) {
    activeMasterFetchPromise = doMasterFetch().finally(() => {
      activeMasterFetchPromise = null;
    });
  }
  return activeMasterFetchPromise;
}

function getSubordinateIdentifiers(currentUser: any, users: any[]) {
  const currentUserId = String(currentUser.id || currentUser.employee_id || '').toLowerCase().trim();
  const currentUserName = String(currentUser.name || '').toLowerCase().trim();

  const subordinateIds = new Set<string>();
  const subordinateNames = new Set<string>();

  const managersQueue: string[] = [];
  if (currentUserId) managersQueue.push(currentUserId);
  if (currentUserName && currentUserName !== currentUserId) managersQueue.push(currentUserName);

  const processedManagers = new Set<string>();

  while (managersQueue.length > 0) {
    const activeManager = managersQueue.shift()!;
    if (processedManagers.has(activeManager)) continue;
    processedManagers.add(activeManager);

    users.forEach((u: any) => {
      const uManager = String(u.MAINAGER || u.mainager || u.Manager || '').toLowerCase().trim();
      if (uManager === activeManager) {
        const uId = String(u.ID || u.id || '').toLowerCase().trim();
        const uName = String(u['USER NAME'] || u.name || '').toLowerCase().trim();
        
        if (uId && !subordinateIds.has(uId)) {
          subordinateIds.add(uId);
          managersQueue.push(uId);
        }
        if (uName && !subordinateNames.has(uName)) {
          subordinateNames.add(uName);
          managersQueue.push(uName);
        }
      }
    });
  }

  return { subordinateIds, subordinateNames };
}

const MOCK_USERS: any[] = []; // Handled by server-mocks
const MOCK_LEADS: any[] = []; // Handled by server-mocks

console.log('--- SERVER INITIALIZING ---');
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());
  app.use(cors());

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    }
    next();
  });

  const upload = multer({ storage: multer.memoryStorage() });

  // JWT Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token is missing' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
      if (err) {
        console.error('JWT Error:', err);
        const isExpired = err.name === 'TokenExpiredError';
        return res.status(401).json({ 
          error: isExpired ? 'JWT Error: TokenExpiredError: jwt expired' : `JWT Verification Error: ${err.message}`,
          expired: isExpired
        });
      }
      req.user = user;
      next();
    });
  };

  const authorizeRoles = (...roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        console.warn(`Unauthorized access attempt by user ${req.user?.id} with role ${req.user?.role}`);
        return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
      }
      next();
    };
  };

  // --- API Routes ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth: Login
  app.get('/api/debug/fetch', async (req, res) => {
    try {
      const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
      if (!scriptUrl) return res.json({ error: 'GOOGLE_SCRIPT_URL is not set' });
      
      const start = Date.now();
      const response = await fetch(`${scriptUrl}?sheet=Login`);
      const duration = Date.now() - start;
      
      const text = await response.text();
      res.json({
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        durationMs: duration,
        bodyPreview: text.substring(0, 500)
      });
    } catch (err: any) {
      res.json({ error: err.message, stack: err.stack });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log(`Login attempt for: ${email}`);
      
      const users = await refreshUsersCache();

      // Check both 'Gmail' (sheet column), 'ID' (first column), and 'email' (mock/standard)
      const user = users.find((u: any) => {
        const uGmail = (u.Gmail || u.email || '').toLowerCase();
        const uID = (u.ID || '').toLowerCase();
        const searchIdentifier = email.toLowerCase();
        return uGmail === searchIdentifier || uID === searchIdentifier;
      });

      if (!user) {
        console.warn(`User not found with identifier: ${email}`);
        // Log available identifiers for debugging (only in dev/logs)
        console.log('Available identifiers in sheet:', users.map(u => ({ id: u.ID, gmail: u.Gmail })));
        return res.status(401).json({ error: 'User not found. Please check your Operational ID or Gmail.' });
      }

      // Handle the password mapping from 'PASSWORD' column (all caps in sheet image)
      const userPassword = user.PASSWORD || user.password || '';

      const isMatch = userPassword.startsWith('$2a$') 
        ? await bcrypt.compare(password, userPassword)
        : userPassword === password;

      if (!isMatch) {
        console.warn(`Invalid password for user: ${email}`);
        return res.status(401).json({ error: 'Invalid password' });
      }

      const payload = { 
        id: user.ID || user.id || user.employee_id, 
        email: user.Gmail || user.email, 
        role: (user.ROLE || user.role || 'SALES').toUpperCase(), 
        name: user['USER NAME'] || user.name,
        employee_id: user.ID || user.employee_id,
        senior_sales_id: user.senior_sales_id,
        profile_url: user['PROFILE URL'] || user['PROFILE_URL'] || ''
      };
      
      console.log(`Login successful for: ${email} with role ${payload.role}`);
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
      res.json({ token, user: payload });
    } catch (error: any) {
      console.error('Login Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Profile: Update DP URL
  app.post('/api/users/profile', authenticateToken, async (req: any, res) => {
    try {
      const { profile_url } = req.body;
      const { id } = req.user;
      
      let userIndex = -1;
      if (USERS_CACHE) {
        userIndex = USERS_CACHE.findIndex((u: any) => (u.ID || u.id || u.employee_id) === id);
        if (userIndex !== -1) {
          USERS_CACHE[userIndex]['PROFILE URL'] = profile_url;
        }
      }

      if (userIndex !== -1) {
        // Use updateCell to update 'PROFILE URL' (Column H = 8)
        const rowIndex = userIndex + 2; // +1 for 0-index offset, +1 for header row
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
        if (scriptUrl) {
          const params = new URLSearchParams();
          params.append('action', 'updateCell');
          params.append('sheetName', 'Login');
          params.append('rowIndex', rowIndex.toString());
          params.append('columnIndex', '8');
          params.append('value', profile_url);
          
          const resp = await fetch(scriptUrl, { method: 'POST', body: params });
          if (!resp.ok) console.error('Failed to update DP in Sheets', await resp.text());
        }
      } else {
        console.warn('User not found in cache, skipping sheet update');
      }
      
      res.json({ success: true, profile_url });
    } catch (error: any) {
      console.error('Failed to update profile URL:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/users/avatars', authenticateToken, async (req, res) => {
    try {
      const users = await refreshUsersCache();
      const avatars = users.map((u: any) => ({
        name: u['USER NAME'] || u.name || '',
        profile_url: u['PROFILE URL'] || u.profile_url || '', password: u.PASSWORD || u.password || ''
      }));
      res.json(avatars);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Leads: List
  app.get('/api/leads', authenticateToken, async (req: any, res) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const leads = await refreshLeadsCache(forceRefresh);
      const users = await refreshUsersCache();
      const { role, id, employee_id, name } = req.user;

      // Role filter logic
      let filteredLeads = leads;
      if (role !== 'ADMIN') {
        const userId = id || employee_id;
        const userName = name || '';
        
        const { subordinateIds, subordinateNames } = getSubordinateIdentifiers(req.user, users);

        filteredLeads = leads.filter(l => {
          // Check if user is the direct owner or named sales person
          const isOwner = l.owner_id === userId || l.owner_id === employee_id || l.owner_id === id;
          const isNamedSales = l.sales_person_name && userName && 
                              l.sales_person_name.toLowerCase().trim() === userName.toLowerCase().trim();
          
          const leadOwnerId = String(l.owner_id || '').toLowerCase().trim();
          const leadSalesName = String(l.sales_person_name || '').toLowerCase().trim();
          
          // Check if user is the creator (Entry By Id)
          const isEntryCreator = l.entry_by_id && (l.entry_by_id === userId || l.entry_by_id === employee_id || l.entry_by_id === id);

          const isSubordinateOwner = leadOwnerId && subordinateIds.has(leadOwnerId);
          const isSubordinateSales = leadSalesName && subordinateNames.has(leadSalesName);

          return isOwner || isNamedSales || isEntryCreator || isSubordinateOwner || isSubordinateSales;
        });
      }
      
      res.set('Cache-Control', 'no-store');
      res.json(filteredLeads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Leads: Create (Standard)
  app.post('/api/leads', authenticateToken, async (req: any, res) => {
    try {
      const leadData = {
        ...req.body,
        id: `LD-${Date.now()}`,
        status: 'COLD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Background save to Sheets
      SheetsDB.addRow('NEW_FMS', leadData, 5).catch(e => console.error("Background Sheet Add Error:", e))
        .finally(() => refreshLeadsCache(true));
      
      // Update cache optimistically
      if (LEADS_CACHE) {
        LEADS_CACHE.push(leadData);
      }
      
      res.status(201).json(leadData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Leads: Create (NEW_FMS Special)
  app.post('/api/leads/entry', authenticateToken, async (req: any, res) => {
    try {
      const leadData = req.body;
      const entryUserId = req.user.employee_id || req.user.id || '';
      leadData['Entry By Id'] = entryUserId;
      if (leadData['Follow Up date'] !== undefined) {
        leadData['Follow Up date'] = formatDateForSheet(leadData['Follow Up date']);
      }

      // Auto-generate ID if it's missing from the frontend
      if (!leadData.Id) {
        const ppplIds = (LEADS_CACHE || [])
          .map((r: any) => r.id)
          .filter((id: any) => typeof id === 'string' && id.startsWith('PPPL-26-'))
          .map((id: string) => parseInt(id.replace('PPPL-26-', ''), 10))
          .filter((num: number) => !isNaN(num));
        let nextNum = 1424;
        if (ppplIds.length > 0) {
          nextNum = Math.max(...ppplIds) + 1;
        }
        leadData.Id = `PPPL-26-${nextNum}`;
      }
      
      // Save to 'NEW_FMS' sheet in background
      SheetsDB.addRow('NEW_FMS', leadData, 5).catch(e => console.error("Background Sheet Add Error:", e))
        .finally(() => refreshLeadsCache(true));
      
      // Update cache optimistically
      if (LEADS_CACHE) {
        const l = leadData;
        const newLead = {
          id: l['Id'],
          company_name: l['Party Name'] || '',
          contact_person: l['Person Name'] || '',
          mobile: l['Mobile No. '] || l['Mobile No.'] || '',
          email: l['Gmail ID'] || '',
          address: l['Address'] || '',
          state: l['State'] || '',
          district: l['District'] || '',
          owner_id: l['Sales Person Name'] || 'SYSTEM_FMS',
          source: l['Source'] || '',
          follow_up_date: l['Follow Up date'] || '',
          mcb_kit_url: l['MCBs. (KIT) URl'] || '',
          last_remarks: l['Last Remarks'] || '',
          status: normalizePipelineStage(l['Pramoted To'] || l['Stage'] || l['stage']),
          sales_person_name: l['Sales Person Name'] || '',
          followup_date: l['Follow Up date'] || '',
          'District': l['District'],
          'Follow Up date': l['Follow Up date'],
          'Source': l['Source'],
          'Party Name': l['Party Name'],
          'Person Name': l['Person Name'],
          'Mobile No. ': l['Mobile No. '],
          'Gmail ID': l['Gmail ID'],
          'MCBs. (KIT) URl': l['MCBs. (KIT) URl'],
          'Last Remarks': l['Last Remarks'],
          'Entry By Id': entryUserId,
          entry_by_id: entryUserId,
          created_at: l['Timestamp'] || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_fms: true,
          // Technical fields to avoid undefined errors
          lead_planned_date: '',
          lead_actual_date: '',
          meeting_planned_date: '',
          meeting_actual_date: '',
          tech_planned_date: '',
          tech_actual_date: '',
          sample_planned_date: '',
          sample_actual_date: '',
          negotiation_planned_date: '',
          negotiation_actual_date: '',
          order_planned_date: '',
          order_actual_date: '',
          source_sheet: 'NEW_FMS'
        };
        LEADS_CACHE.unshift(newLead);
      }
      
      res.status(201).json(leadData);
    } catch (error: any) {
      console.error('Lead creation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Leads: Update (Movement logic)
  app.patch('/api/leads/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, updated_at: new Date().toISOString() };

      Object.keys(updateData).forEach(key => {
        if (typeof updateData[key] === 'string' && updateData[key].trim() === '') {
          delete updateData[key];
        }
      });
      
      const leads = LEADS_CACHE || await refreshLeadsCache(true);
      
      // Lead Assignment check: Only ADMIN can change owner_id
      if (updateData.owner_id && req.user.role !== 'ADMIN') {
        const existingLead = leads.find((l: any) => l.id === id);
        if (existingLead && existingLead.owner_id !== updateData.owner_id) {
          return res.status(403).json({ error: 'Only admins can reassign leads.' });
        }
      }

      const existingLeadObj = leads.find((l: any) => l.id === id);
      const prevStatus = existingLeadObj ? existingLeadObj.status : null;
      const isFms = true; // Force everything to NEW_FMS
      const sheetName = 'NEW_FMS';
      const idField = 'Id';
      
      const mappedUpdate = { ...updateData };
      if (updateData.status) {
        mappedUpdate['Pramoted To'] = updateData.status;
        mappedUpdate['__col_14'] = updateData.status;
      }
      if (updateData.company_name) mappedUpdate['Party Name'] = updateData.company_name;
      const followUpDateValue = updateData.followup_date ?? updateData['Follow Up date'] ?? updateData['__col_13'];
      if (followUpDateValue !== undefined) {
        const formattedFollowUpDate = formatDateForSheet(followUpDateValue);
        mappedUpdate.followup_date = formattedFollowUpDate;
        mappedUpdate['Follow Up date'] = formattedFollowUpDate;
        mappedUpdate['__col_13'] = formattedFollowUpDate;
      }
      
      // DO NOT STORE FORMULA DATES
      delete mappedUpdate.lead_planned_date;
      delete mappedUpdate['Lead Planned Date'];
      delete mappedUpdate.meeting_planned_date;
      delete mappedUpdate['Meeting Planned Date'];
      delete mappedUpdate.tech_planned_date;
      delete mappedUpdate['Technical Discussion Planned'];
      delete mappedUpdate['Technical Discussion Planned Date'];
      delete mappedUpdate['Tech Planned'];
      delete mappedUpdate['Tech Planned Date'];
      delete mappedUpdate['__col_32'];
      delete mappedUpdate.negotiation_planned_date;
      delete mappedUpdate.order_planned_date;
      delete mappedUpdate['Order Planned'];
      delete mappedUpdate['Order Planned Date'];
      delete mappedUpdate['__col_59'];
      delete mappedUpdate.sample_planned_date;
      delete mappedUpdate['Sample Planned'];
      delete mappedUpdate['Sample Planned Date'];
      delete mappedUpdate['__col_73'];
      
      // Map Lead Stage fields
      if (updateData.lead_actual_date !== undefined) {
        mappedUpdate['__col_16'] = updateData.lead_actual_date;
        mappedUpdate['Lead Actual Date'] = updateData.lead_actual_date;
        mappedUpdate['actual_date'] = updateData.lead_actual_date;
      }
      if (updateData.custom_status !== undefined) mappedUpdate['Lead Status'] = updateData.custom_status;
      if (updateData.lead_status !== undefined && !updateData.custom_status) mappedUpdate['Lead Status'] = updateData.lead_status;
      if (updateData.product_details !== undefined) mappedUpdate['Product details.'] = updateData.product_details;
      if (updateData.mcb_requirement !== undefined) {
        mappedUpdate['MCB according to requirement. Url'] = updateData.mcb_requirement;
        mappedUpdate['MCB according to requirement.'] = updateData.mcb_requirement; // fallback
      }
      if (updateData.pain_points !== undefined) mappedUpdate['__col_20'] = updateData.pain_points;
      if (updateData.kit_details !== undefined) {
        mappedUpdate['KIT Url'] = updateData.kit_details;
        mappedUpdate['KIT.'] = updateData.kit_details; // fallback
      }
      if (updateData.meeting_followup_date !== undefined) {
        mappedUpdate['Meeting Follow-up Date.'] = updateData.meeting_followup_date;
      }

      // Map Meeting Stage fields
      // Do NOT map Meeting Planned or Meeting Planned Date as they are formula-generated
      if (updateData.meeting_actual_date !== undefined) {
        mappedUpdate['Meeting Actual'] = updateData.meeting_actual_date;
        mappedUpdate['Meeting Actual Date'] = updateData.meeting_actual_date;
        mappedUpdate['Meeting Actual date'] = updateData.meeting_actual_date;
      }
      if (updateData.meeting_status !== undefined) {
        mappedUpdate['Meeting Status'] = updateData.meeting_status;
      }
      if (updateData.reschedule_date !== undefined) mappedUpdate['Reschedule Meeting Date'] = updateData.reschedule_date;
      if (updateData.discussion_points !== undefined) {
        mappedUpdate['Discussion Points'] = updateData.discussion_points;
        mappedUpdate['Discussion Points.'] = updateData.discussion_points;
      }
      if (updateData.meeting_person_name !== undefined) mappedUpdate['Meeting Person Name'] = updateData.meeting_person_name;
      if (updateData.meeting_number !== undefined) {
        mappedUpdate['Contact Number'] = updateData.meeting_number;
        mappedUpdate['Contact No'] = updateData.meeting_number;
        mappedUpdate['Number'] = updateData.meeting_number;
      }
      if (updateData.bullet_point_remarks !== undefined) {
        mappedUpdate['Bullet Point Remarks'] = updateData.bullet_point_remarks;
        mappedUpdate['Bullet Point Remarks.'] = updateData.bullet_point_remarks;
      }
      if (updateData.meeting_url !== undefined) mappedUpdate['Picture of Meeting Url'] = updateData.meeting_url;

      // Map Technical Discussion Stage fields
      // Map Negotiation Stage fields
      if (updateData.negotiation_actual_date !== undefined) mappedUpdate['__col_47'] = updateData.negotiation_actual_date;
      if (updateData.negotiation_status !== undefined) {
        if (updateData.status === 'NEGOTIATION') {
          mappedUpdate['__col_48'] = updateData.negotiation_status;
        }
      }
      if (updateData.quotation_url !== undefined) mappedUpdate['__col_49'] = updateData.quotation_url;
      if (updateData.unit !== undefined) mappedUpdate['__col_50'] = updateData.unit;
      if (updateData.final_price !== undefined) mappedUpdate['__col_51'] = updateData.final_price;
      if (updateData.quantity !== undefined) mappedUpdate['__col_52'] = updateData.quantity;
      if (updateData.payment_terms !== undefined) mappedUpdate['__col_53'] = updateData.payment_terms;
      if (updateData.delivery_schedule !== undefined) mappedUpdate['__col_54'] = updateData.delivery_schedule;
      if (updateData.party_type !== undefined) mappedUpdate['__col_55'] = updateData.party_type;
      if (updateData.negotiation_remark !== undefined) mappedUpdate['__col_56'] = updateData.negotiation_remark;
      if (updateData.negotiation_kit_url !== undefined) mappedUpdate['__col_57'] = updateData.negotiation_kit_url;

      // Map Order Stage fields
      if (updateData.order_actual_date !== undefined) mappedUpdate['__col_60'] = updateData.order_actual_date;
      if (updateData.order_copy_url !== undefined) mappedUpdate['__col_61'] = updateData.order_copy_url;
      if (updateData.delivery_in !== undefined) mappedUpdate['__col_62'] = updateData.delivery_in;
      if (updateData.unloading !== undefined) mappedUpdate['__col_63'] = updateData.unloading;
      if (updateData.motor_pump_requirement !== undefined) mappedUpdate['__col_64'] = updateData.motor_pump_requirement;
      if (updateData.transport !== undefined) mappedUpdate['__col_65'] = updateData.transport;
      if (updateData.order_remark !== undefined) mappedUpdate['__col_66'] = updateData.order_remark;
      if (updateData.order_attachment_url !== undefined) mappedUpdate['__col_67'] = updateData.order_attachment_url;
      if (updateData.order_status !== undefined) mappedUpdate['__col_68'] = updateData.order_status;
      
      // Map Sample Stage fields
      if (updateData.sample_actual_date !== undefined) mappedUpdate['__col_74'] = formatDateForSheet(updateData.sample_actual_date);
      if (updateData.sample_status !== undefined) mappedUpdate['__col_75'] = updateData.sample_status;
      if (updateData.sample_product_name !== undefined) mappedUpdate['__col_76'] = updateData.sample_product_name;
      if (updateData.sample_qty !== undefined) mappedUpdate['__col_77'] = updateData.sample_qty;
      if (updateData.sample_dispatch_date !== undefined) mappedUpdate['__col_78'] = updateData.sample_dispatch_date;
      if (updateData.sample_remark !== undefined) mappedUpdate['__col_79'] = updateData.sample_remark;
      if (updateData.sample_attachment !== undefined) mappedUpdate['__col_80'] = updateData.sample_attachment;

      // Map Close Fields
      if (updateData.status === 'CLOSED') {
        if (updateData.closed_at !== undefined) {
           mappedUpdate['lead Closed date'] = updateData.closed_at;
           mappedUpdate['__col_70'] = updateData.closed_at;
        }
        if (updateData.close_reason !== undefined) {
           mappedUpdate['Reason'] = updateData.close_reason;
           mappedUpdate['__col_71'] = updateData.close_reason;
        }
        if (updateData.close_remark !== undefined) {
           mappedUpdate['Remark'] = updateData.close_remark;
           mappedUpdate['__col_72'] = updateData.close_remark;
        }
      }

      SheetsDB.updateRow(sheetName, idField, id, mappedUpdate, isFms ? 5 : 0).catch(e => console.error("Background updateRow failed:", e));

      if (existingLeadObj) {
        Object.assign(existingLeadObj, updateData);
      }

      refreshLeadsCache(true).catch(e => console.error('Post-update cache refresh failed:', e));

      // Side logs should never block the primary NEW_FMS update.
      (async () => {
        try {
          if (updateData.status && prevStatus && prevStatus !== updateData.status) {
            try {
              await SheetsDB.addRow('LeadHistory', {
                id: `HIST-${Date.now()}`,
                lead_id: id,
                prev_stage: prevStatus,
                next_stage: updateData.status,
                user_id: req.user.id,
                timestamp: new Date().toISOString(),
                remarks: updateData.remarks || 'Status change'
              });
            } catch (err) {
              console.error("LeadHistory side-log failed:", err);
            }
          }
          
          if (updateData.meeting_status === 'Reschedule' || updateData.tech_status === 'Reschedule' || updateData.negotiation_status === 'Reschedule' || updateData.status === 'Reschedule') {
            const d = new Date();
            const formattedTimestamp = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            const rescheduleData = {
              'Timestamp': formattedTimestamp,
              'Id': id,
              'Party Name': updateData.company_name || existingLeadObj?.company_name || '',
              'Reschedule Date': updateData.reschedule_date || '',
              'Remark': updateData.custom_status || '',
              'Stage': updateData.status || existingLeadObj?.status || 'MEETING',
            };
            await SheetsDB.addRow('Reschedule', rescheduleData).catch(err => console.error("Reschedule side-log failed:", err));
          }
    
          if (Array.isArray(updateData.tech_products) && updateData.tech_products.length > 0 && updateData.tech_status !== 'Reschedule') {
            for (const prod of updateData.tech_products) {
              const d = new Date();
              const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
              const productData = {
                'Id': id,
                'Timetamp': updateData.tech_actual_date || formattedDate,
                'Party Name': updateData.company_name || existingLeadObj?.company_name || '',
                'Product Name': prod.product_name || '',
                'Density': prod.density || '',
                'GCV': prod.gcv || '',
                'Flash Point': prod.flash_point || '',
                'Moisture': prod.moisture || '',
                'Carbon Content': prod.carbon_content || '',
                'Sulphur': prod.sulphur || '',
                'Remarks in Detail.': prod.remarks || '',
                'Sediment.': prod.sediment || '',
                'Kit Attachment Url': updateData.tech_kit_url || '',
                'Technical Status': updateData.tech_status || ''
              };
              await SheetsDB.addRow('Prodcut Negotiation', productData).catch(err => console.error("Product negotiation side-log failed:", err));
            }
          }
        } catch (err) {
          console.error("Background side-log error:", err);
        }
      })();
      
      res.json({ success: true, ...existingLeadObj });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Leads: Delete (ADMIN and CRM role check)
  app.delete('/api/leads/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role, employee_id, name: deleterName } = req.user;
      if (role !== 'ADMIN' && role !== 'CRM') {
        return res.status(403).json({ error: 'Only ADMIN and CRM roles are allowed to delete leads.' });
      }

      const leads = await refreshLeadsCache();
      const targetLead = leads.find((l: any) => l.id === id);
      const isFms = true;
      const sheetName = 'NEW_FMS';

      // Optimistically remove from cache
      if (LEADS_CACHE) {
        LEADS_CACHE = LEADS_CACHE.filter((l: any) => l.id !== id);
      }

      // Capture delete timestamp
      const deletedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      // Delete in background
      (async () => {
        try {
          // 1. First, log deletion to 'Deleted' sheet for record-keeping
          const deletedRowData: any = {
            'Id': id,
            'DELETE': id,
            'Entry By Id': employee_id || deleterName || 'SYSTEM',
            'Deleted By': deleterName || employee_id || 'SYSTEM',
            'Deleted At': deletedAt,
            'Party Name': targetLead?.company_name || targetLead?.['Party Name'] || '',
            'Person Name': targetLead?.contact_person || targetLead?.['Person Name'] || '',
            'Mobile No. ': targetLead?.mobile || targetLead?.['Mobile No. '] || '',
            'Owner': targetLead?.owner_id || '',
            'Status': targetLead?.status || '',
            'Source': targetLead?.source || targetLead?.['Source'] || '',
            'Sheet': sheetName,
          };
          await SheetsDB.addRow('Deleted', deletedRowData).catch(e =>
            console.error('Failed to log deletion to Deleted sheet:', e)
          );

          // 2. Actually DELETE the row from the data sheet
          await SheetsDB.deleteRow(sheetName, 'Id', id, 5);
          console.log(`[DELETE] Successfully deleted lead ${id} from ${sheetName}`);
        } catch (err) {
          console.error("Background Sheet Delete Error:", err);
        } finally {
          refreshLeadsCache(true);
        }
      })();

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Followups
  app.get('/api/history/:leadId', authenticateToken, async (req, res) => {
    try {
      const cache = await refreshExtraDataCache();
      res.json(cache.history.filter((h: any) => h.lead_id === req.params.leadId || h.Id === req.params.leadId || h.id === req.params.leadId));
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        res.json([]);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.get('/api/leads/:id/tech-products', authenticateToken, async (req, res) => {
    try {
      const cache = await refreshExtraDataCache();
      res.json(cache.techProducts.filter((p: any) => p.Id === req.params.id));
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        res.json([]);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.get('/api/followups/:leadId', authenticateToken, async (req, res) => {
    try {
      const cache = await refreshExtraDataCache();
      res.json(cache.followups.filter((f: any) => f.lead_id === req.params.leadId));
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        res.json([]);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post('/api/followups', authenticateToken, async (req: any, res) => {
    try {
      const followup = {
        ...req.body,
        id: `FL-${Date.now()}`,
        user_id: req.user.id,
        created_at: new Date().toISOString()
      };
      await SheetsDB.addRow('Followups', followup);
      res.status(201).json(followup);
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        res.status(400).json({ error: "Please create a sheet named 'Followups' in your Google Spreadsheet to add followups." });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Drive Upload
  app.post('/api/upload', authenticateToken, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
      if (scriptUrl) {
        try {
          const base64Data = req.file.buffer.toString('base64');
          const params = new URLSearchParams();
          params.append('action', 'uploadFile');
          params.append('base64Data', base64Data);
          params.append('fileName', req.file.originalname);
          params.append('mimeType', req.file.mimetype);
          params.append('folderId', process.env.GOOGLE_DRIVE_FOLDER_ID || '');

          const response = await fetch(scriptUrl, {
            method: 'POST',
            body: params
          });
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Google Apps Script upload returned non-JSON response');
          }

          const result = await response.json();
          if (result.success) {
            return res.json({ id: result.fileUrl.split('id=')[1], name: req.file.originalname, webViewLink: result.fileUrl });
          }
        } catch (e) {
          console.error('App Script upload failed, falling back to direct API', e);
        }
      }

      const drive = await getDriveClient();
      const fileMetadata = {
        name: req.file.originalname,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
      };
      const media = {
        mimeType: req.file.mimetype,
        body: streamifier.createReadStream(req.file.buffer),
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      res.json(file.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // User Management
  app.get('/api/users', authenticateToken, authorizeRoles('ADMIN', 'CRM'), async (req, res) => {
    try {
      const users = await refreshUsersCache();
      const safeUsers = users.map((u: any) => ({
        id: u.ID || u.id || '',
        name: u['USER NAME'] || u.name || '',
        email: u.GMAIL || u.Gmail || u.email || '',
        role: (u.ROLE || u.role || 'SALES').toUpperCase(),
        employee_id: u.ID || u.employee_id || '',
        profile_url: u['PROFILE URL'] || u.profile_url || '', password: u.PASSWORD || u.password || ''
      }));
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/users', authenticateToken, authorizeRoles('ADMIN', 'CRM'), async (req, res) => {
    try {
      const { password, ...userData } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        ID: userData.employee_id || `USER-${Date.now()}`,
        PASSWORD: hashedPassword,
        'USER NAME': userData.name,
        ROLE: userData.role || 'SALES',
        GMAIL: userData.email,
        MAINAGER: '',
        CRM: '',
        'PROFILE URL': '',
        'LAST LOGIN DATE AND TIME': ''
      };
      
      // Optimistic update
      if (USERS_CACHE) {
        USERS_CACHE.push(newUser);
      }

      // Background write
      SheetsDB.addRow('Login', newUser)
        .catch(err => console.error('Failed to add user to Sheets:', err))
        .finally(() => refreshUsersCache(true));
        
      const { PASSWORD: _, password: __, ...safeUser } = newUser as any;
      res.status(201).json(safeUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/users/:id', authenticateToken, authorizeRoles('ADMIN', 'CRM'), async (req, res) => {
    try {
      const { id } = req.params;
      const { password, ...userData } = req.body;
      
      let userIndex = -1;
      if (USERS_CACHE) {
        userIndex = USERS_CACHE.findIndex((u: any) => (u.ID || u.id || u.employee_id) === id);
      }

      if (userIndex !== -1) {
        // Optimistic update
        const u = USERS_CACHE[userIndex];
        u['USER NAME'] = userData.name;
        u.ROLE = userData.role;
        u.GMAIL = userData.email;
        if (password && password.trim() !== '') {
          u.PASSWORD = await bcrypt.hash(password, 10);
        }

        const rowIndex = userIndex + 2;
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
        if (scriptUrl) {
          // Perform updates in background
          (async () => {
            try {
              const updates = [
                { col: '3', val: userData.name },
                { col: '4', val: userData.role },
                { col: '5', val: userData.email }
              ];

              if (password && password.trim() !== '') {
                updates.push({ col: '2', val: await bcrypt.hash(password, 10) });
              }

              for (const u of updates) {
                const params = new URLSearchParams();
                params.append('action', 'updateCell');
                params.append('sheetName', 'Login');
                params.append('rowIndex', rowIndex.toString());
                params.append('columnIndex', u.col);
                params.append('value', u.val);
                await fetch(scriptUrl, { method: 'POST', body: params });
              }
            } catch (err) {
              console.error('Failed to update user in Sheets:', err);
            } finally {
              refreshUsersCache(true);
            }
          })();
        }
      } else {
        console.warn('User not found in cache for PUT');
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/users/:id', authenticateToken, authorizeRoles('ADMIN', 'CRM'), async (req, res) => {
    try {
      const { id } = req.params;
      let userIndex = -1;
      if (USERS_CACHE) {
        userIndex = USERS_CACHE.findIndex((u: any) => (u.ID || u.id || u.employee_id) === id);
      }

      if (userIndex !== -1) {
        const rowIndex = userIndex + 2;
        
        // Optimistic update
        USERS_CACHE.splice(userIndex, 1);
        
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
        if (scriptUrl) {
          // Perform updates in background
          (async () => {
            try {
              const updates = ['1', '2', '3', '4', '5', '6', '7', '8'];
              for (const col of updates) {
                const params = new URLSearchParams();
                params.append('action', 'updateCell');
                params.append('sheetName', 'Login');
                params.append('rowIndex', rowIndex.toString());
                params.append('columnIndex', col);
                params.append('value', '');
                await fetch(scriptUrl, { method: 'POST', body: params });
              }
            } catch (err) {
              console.error('Failed to delete user in Sheets:', err);
            } finally {
              refreshUsersCache(true);
            }
          })();
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports/Stats
  app.get('/api/stats', authenticateToken, async (req: any, res) => {
    try {
      const leads = await refreshLeadsCache();
      const users = await refreshUsersCache();
      const { role, id, employee_id, name } = req.user;

      // Filter leads based on role for stats too
      let filteredLeads = leads;
      if (role !== 'ADMIN') {
        const userId = id || employee_id;
        const userName = name || '';

        const { subordinateIds, subordinateNames } = getSubordinateIdentifiers(req.user, users);

        filteredLeads = leads.filter((l: any) => {
          const isOwner = l.owner_id === userId || l.owner_id === employee_id || l.owner_id === id;
          const isNamedSales = l.sales_person_name && userName && 
                              l.sales_person_name.toLowerCase().trim() === userName.toLowerCase().trim();

          const leadOwnerId = String(l.owner_id || '').toLowerCase().trim();
          const leadSalesName = String(l.sales_person_name || '').toLowerCase().trim();

          const isSubordinateOwner = leadOwnerId && subordinateIds.has(leadOwnerId);
          const isSubordinateSales = leadSalesName && subordinateNames.has(leadSalesName);

          return isOwner || isNamedSales || isSubordinateOwner || isSubordinateSales;
        });
      }

      const stats = {
        totalLeads: filteredLeads.length,
        activeLeads: filteredLeads.filter((l: any) => l.status !== 'CLOSED' && l.status !== 'ORDER').length,
        closedLeads: filteredLeads.filter((l: any) => l.status === 'CLOSED').length,
        convertedOrders: filteredLeads.filter((l: any) => l.status === 'ORDER').length,
      };
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Master Data (States/Districts)
  app.get('/api/master-data', authenticateToken, async (req, res) => {
    try {
      const data = await refreshMasterCache();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get active Notice from Master B2 (Notice col in row with Source === 'Self')
  let quickAccessCache: any[] | null = null;
  let lastQuickAccessFetch = 0;
  let activeQuickAccessFetch: Promise<any> | null = null;

  app.get('/api/quick-access', authenticateToken, async (req, res) => {
    try {
      const now = Date.now();
      
      // Background fetch if expired
      if (quickAccessCache && (now - lastQuickAccessFetch >= 5 * 60 * 1000)) {
        if (!activeQuickAccessFetch) {
          activeQuickAccessFetch = SheetsDB.getRows('Quick Access').then(rows => {
            quickAccessCache = rows || [];
            lastQuickAccessFetch = Date.now();
            return quickAccessCache;
          }).finally(() => {
            activeQuickAccessFetch = null;
          });
        }
      }

      // If we don't have cache, fetch it now
      if (!quickAccessCache) {
        if (!activeQuickAccessFetch) {
          activeQuickAccessFetch = SheetsDB.getRows('Quick Access').then(rows => {
            quickAccessCache = rows || [];
            lastQuickAccessFetch = Date.now();
            return quickAccessCache;
          }).finally(() => {
            activeQuickAccessFetch = null;
          });
        }
        await activeQuickAccessFetch;
      }
      
      res.json(quickAccessCache || []);
    } catch (error: any) {
      console.error('Error fetching Quick Access:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const MEETING_CHECKLIST_SHEET = 'Meeting Checklist';
  const MEETING_CHECKLIST_HEADERS = [
    'Date',
    'Party Name',
    'Appointment scheduled through CRM',
    "Verify and obtain the client's location from CRM before travel",
    'Inform concerned staff via WhatsApp/Email about the visit',
    "Inform Varsha Ma'am one day before for car arrangement",
    'Reach the meeting location on time',
    'Questionnaire Sheet',
    'Gift (as per designation)',
    '2 Pens',
    'Pad/Tablet',
    'Notepad/Sticky Pad',
    'Visiting Cards',
    'PPPL Badge',
    'Formal Attire',
    'Review customer records before meeting',
    'Present company profile/System/Sales Deck',
    "Understand client's process",
    'Discuss usage of our fuel in their process',
    'Ask for referrals',
    'Click photographs',
    'Request testimonial/feedback',
    'Send thank-you email with photo attachment',
  ];

  const formatMeetingChecklistDate = (value: any) => {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return raw;
    return `${match[3]}/${match[2]}/${match[1]}`;
  };

  const ensureMeetingChecklistHeaders = async (scriptUrl: string) => {
    const response = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(MEETING_CHECKLIST_SHEET)}`);
    if (!response.ok) {
      throw new Error(`Google Apps Script returned status ${response.status} while reading Meeting Checklist`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Unable to read Meeting Checklist sheet');
    }

    const existingHeaders = result.data?.[0] || [];
    for (let index = 0; index < MEETING_CHECKLIST_HEADERS.length; index++) {
      if (existingHeaders[index] === MEETING_CHECKLIST_HEADERS[index]) continue;

      const params = new URLSearchParams();
      params.append('action', 'updateCell');
      params.append('sheetName', MEETING_CHECKLIST_SHEET);
      params.append('rowIndex', '1');
      params.append('columnIndex', String(index + 1));
      params.append('value', MEETING_CHECKLIST_HEADERS[index]);

      const updateResponse = await fetch(scriptUrl, { method: 'POST', body: params });
      if (!updateResponse.ok) {
        throw new Error(`Google Apps Script returned status ${updateResponse.status} while updating checklist headers`);
      }

      const updateResult = await updateResponse.json();
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Unable to update Meeting Checklist headers');
      }
    }
  };

  const isMeetingChecklistChecked = (value: any) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'checked';
  };

  app.get('/api/meeting-checklist/party-names', authenticateToken, async (req: any, res) => {
    try {
      const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();
      let rawData: any[] = [];

      if (scriptUrl) {
        const response = await fetch(`${scriptUrl}?sheet=${encodeURIComponent('Scot Sheet Data')}`);
        if (!response.ok) {
          throw new Error(`Google Apps Script returned status ${response.status} while reading Scot Sheet Data`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Unable to read Scot Sheet Data');
        }

        rawData = (result.data || []).slice(1);
      } else {
        const rows = await SheetsDB.getRows('Scot Sheet Data');
        rawData = rows.map((row: any) => [row.__col_0, row.__col_1, row.__col_2]);
      }

      const partyMap = new Map<string, string>();
      
      rawData.forEach((row: any[]) => {
        const salesPerson = String(row?.[1] || '').trim();
        const partyName = String(row?.[2] || '').trim();
        if (partyName) {
          partyMap.set(partyName, salesPerson);
        }
      });

      let parties = Array.from(partyMap.entries()).map(([name, salesPerson]) => ({
        name,
        salesPerson
      }));

      res.json(parties);
    } catch (error: any) {
      console.error('Meeting Checklist party names fetch error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/meeting-checklist', authenticateToken, async (req: any, res) => {
    try {
      const rows = await SheetsDB.getRows(MEETING_CHECKLIST_SHEET);
      const items = rows
        .map((row: any, index: number) => ({ row, rowIndex: index + 2 }))
        .filter(({ row }: any) => String(row.Date || row.date || row.__col_0 || '').trim() || String(row['Party Name'] || row.partyName || row.__col_1 || '').trim())
        .map(({ row, rowIndex }: any) => {
          const checklist: Record<string, boolean> = {};
          MEETING_CHECKLIST_HEADERS.slice(2).forEach(header => {
            checklist[header] = isMeetingChecklistChecked(row[header]);
          });

          const completedItems = MEETING_CHECKLIST_HEADERS.slice(2).filter(header => checklist[header]);
          return {
            id: `meeting-checklist-${rowIndex}`,
            rowIndex,
            date: row.Date || row.date || row.__col_0 || '',
            partyName: row['Party Name'] || row.partyName || row.__col_1 || '',
            checklist,
            completedItems,
            completedCount: completedItems.length,
            totalCount: MEETING_CHECKLIST_HEADERS.length - 2,
          };
        })
        .reverse();

      res.json(items);
    } catch (error: any) {
      console.error('Meeting Checklist fetch error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/meeting-checklist/:rowIndex', authenticateToken, async (req: any, res) => {
    try {
      const rowIndex = Number(req.params.rowIndex);
      const checklist = req.body?.checklist || {};

      if (!Number.isInteger(rowIndex) || rowIndex < 2) {
        return res.status(400).json({ error: 'Valid Meeting Checklist row is required.' });
      }

      const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();
      if (!scriptUrl) {
        return res.status(500).json({ error: 'GOOGLE_SCRIPT_URL not configured.' });
      }

      await ensureMeetingChecklistHeaders(scriptUrl);

      for (let index = 2; index < MEETING_CHECKLIST_HEADERS.length; index++) {
        const header = MEETING_CHECKLIST_HEADERS[index];
        const params = new URLSearchParams();
        params.append('action', 'updateCell');
        params.append('sheetName', MEETING_CHECKLIST_SHEET);
        params.append('rowIndex', String(rowIndex));
        params.append('columnIndex', String(index + 1));
        params.append('value', checklist[header] ? 'TRUE' : 'FALSE');

        const response = await fetch(scriptUrl, { method: 'POST', body: params });
        if (!response.ok) {
          throw new Error(`Google Apps Script returned status ${response.status} while updating Meeting Checklist`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Unable to update Meeting Checklist');
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Meeting Checklist update error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/meeting-checklist', authenticateToken, async (req: any, res) => {
    try {
      const date = formatMeetingChecklistDate(req.body?.date);
      const partyName = String(req.body?.partyName || '').trim();
      const checklist = req.body?.checklist || {};

      if (!date || !partyName) {
        return res.status(400).json({ error: 'Date and Party Name are required.' });
      }

      const rowData: Record<string, string> = {
        Date: date,
        'Party Name': partyName,
      };

      MEETING_CHECKLIST_HEADERS.slice(2).forEach(header => {
        rowData[header] = checklist[header] ? 'TRUE' : 'FALSE';
      });

      const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();
      if (scriptUrl) {
        await ensureMeetingChecklistHeaders(scriptUrl);

        const rowValues = MEETING_CHECKLIST_HEADERS.map(header => rowData[header] ?? '');
        const params = new URLSearchParams();
        params.append('action', 'insert');
        params.append('sheetName', MEETING_CHECKLIST_SHEET);
        params.append('rowData', JSON.stringify(rowValues));

        const response = await fetch(scriptUrl, { method: 'POST', body: params });
        if (!response.ok) {
          throw new Error(`Google Apps Script returned status ${response.status} while saving Meeting Checklist`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Unable to save Meeting Checklist');
        }
      } else {
        await SheetsDB.addRow(MEETING_CHECKLIST_SHEET, rowData);
      }

      res.status(201).json({ success: true });
    } catch (error: any) {
      console.error('Meeting Checklist save error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/notice', authenticateToken, async (req, res) => {
    try {
      const masterData = await refreshMasterCache(true);
      const b2Row = masterData[0] || {};
      const noticeText = String(b2Row.Notice ?? b2Row.notice ?? b2Row.__col_1 ?? '');
      res.set('Cache-Control', 'no-store');
      res.json({ notice: noticeText });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update active Notice to Master B2 (Notice col in row with Source === 'Self')
  // Allowed ONLY for ADMIN and CRM roles
  app.post('/api/notice', authenticateToken, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'ADMIN' && role !== 'CRM') {
        return res.status(403).json({ error: 'Only ADMIN and CRM roles are allowed to edit settings/notice.' });
      }
      const { notice } = req.body;
      if (notice === undefined) {
        return res.status(400).json({ error: 'Notice field is required.' });
      }

      const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
      if (!scriptUrl) {
        return res.status(500).json({ error: 'GOOGLE_SCRIPT_URL not configured.' });
      }

      // Use Apps Script 'updateCell' action to update Master sheet B2 directly
      // Master sheet: Row 1 = headers (Source, Notice), Row 2 = Self row → B2 = Notice cell
      // rowIndex=2 (Self row), columnIndex=2 (B column = Notice)
      const params = new URLSearchParams();
      params.append('action', 'updateCell');
      params.append('sheetName', 'Master');
      params.append('rowIndex', '2');
      params.append('columnIndex', '2');
      params.append('value', notice);

      const resp = await fetch(scriptUrl, { method: 'POST', body: params });
      console.log('[NOTICE POST] Apps Script response status:', resp.status);

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('[NOTICE POST] Apps Script error body:', errText);
        return res.status(500).json({ error: `Apps Script responded with status ${resp.status}` });
      }

      const ct = resp.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) {
        const rawText = await resp.text();
        console.error('[NOTICE POST] Non-JSON response:', rawText.substring(0, 200));
        return res.status(500).json({ error: 'Apps Script returned non-JSON response.' });
      }

      const result = await resp.json();
      console.log('[NOTICE POST] Apps Script result:', JSON.stringify(result));
      if (!result.success) {
        return res.status(500).json({ error: result.error || 'Apps Script failed to update notice.' });
      }

      console.log('[NOTICE POST] Notice saved to Master B2 via Apps Script updateCell');
      // Force refresh master cache so all users get the new notice immediately
      await doMasterFetch();
      res.json({ success: true, notice });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Catch-all for undefined API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log('--- STARTING VITE DEV SERVER ---');
    const viteMod = 'vite';
    import(viteMod).then(vite => {
      vite.createServer({
        server: { middlewareMode: true },
        appType: "spa",
      }).then(viteServer => {
        app.use(viteServer.middlewares);
        console.log('--- VITE DEV SERVER READY ---');
        
        // SPA fallback for dev to support React Router refresh on nested paths
        app.use('*', async (req, res, next) => {
          if (req.originalUrl.startsWith('/api')) return next();
          try {
            const fs = await import('fs');
            let template = await fs.promises.readFile(path.resolve('index.html'), 'utf-8');
            template = await viteServer.transformIndexHtml(req.originalUrl, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          } catch (e) {
            viteServer.ssrFixStacktrace(e as Error);
            next(e);
          }
        });
      }).catch(err => {
        console.error('Failed to start Vite server:', err);
      });
    }).catch(err => {
      console.error('Failed to import vite:', err);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

// Vercel serverless export
export default app;

// Local development: start listening
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Pre-warm caches
    refreshLeadsCache().catch(e => console.error('Initial Leads Cache warm-up failed:', e));
    refreshUsersCache().catch(e => console.error('Initial Users Cache warm-up failed:', e));
    refreshMasterCache().catch(e => console.error('Initial Master Cache warm-up failed:', e));
    refreshExtraDataCache().catch(e => console.error('Initial Extra Data Cache warm-up failed:', e));
  });
}

