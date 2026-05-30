import express from 'express';

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
const LEADS_CACHE_TTL = 30 * 1000; // 30 seconds for background refresh triggers
const LEADS_STALE_LIMIT = 45 * 1000; // 45 seconds limit to ever block

const USERS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes background refresh trigger
const USERS_STALE_LIMIT = 30 * 60 * 1000; // 30 minutes limit to ever block

const MASTER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes background refresh trigger
const MASTER_STALE_LIMIT = 60 * 60 * 1000; // 60 minutes limit to ever block

let LEADS_CACHE: any[] | null = null;
let USERS_CACHE: any[] | null = null;
let MASTER_CACHE: any[] | null = null;
let LAST_FETCH_LEADS = 0;
let LAST_FETCH_USERS = 0;
let LAST_FETCH_MASTER = 0;

let activeLeadsFetchPromise: Promise<any[]> | null = null;
let activeUsersFetchPromise: Promise<any[]> | null = null;
let activeMasterFetchPromise: Promise<any[]> | null = null;

async function doLeadsFetch() {
  const now = Date.now();
  console.log('Refreshing Leads Cache from Sheets (Fetch)...');
  try {
    let leads: any[] = [];
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SCRIPT_URL) {
      
      // Fetch both sheets in parallel to cut loading time in half, with 8s timeout safeguard
      const [rawMain, fmsRows] = await Promise.all([
        SheetsDB.getRows('Entry Data', undefined, 0, 8000).catch(err => {
          console.warn('Leads sheet fetch failed (Entry Data):', err);
          return [];
        }),
        SheetsDB.getRows('NEW_FMS', undefined, 5, 8000).catch(err => {
          console.error('NEW_FMS fetch failed during cache refresh:', err.message);
          throw err; // Throw error so we don't wipe out the cache with an empty array!
        })
      ]);

      const mainLeads = rawMain.filter((r: any) => (r['Party Name'] || r['Id']) && String(r['Id']).trim().toLowerCase() !== 'id' && String(r['Party Name']).trim().toLowerCase() !== 'party name').map((l: any, index: number) => ({
        id: l['Id'] || `LD-MAIN-${index}`,
        company_name: l['Party Name'] || '',
        contact_person: l['Person Name'] || '',
        mobile: l['Mobile No. '] || l['Mobile No.'] || '',
        email: l['Gmail ID'] || '',
        address: l['Address'] || '',
        state: l['State'] || '',
        district: l['District'] || '',
        source: l['Source'] || '',
        status: l['Stage'] || l['stage'] || l['Lead Status'] || 'COLD',
        sales_person_name: l['Sales Person Name'] || '',
        mcb_kit_url: l['MCBs. (KIT) URl'] || l['MCBs. (KIT)'] || '',
        last_remarks: l['Last Remarks'] || '',
        followup_date: l['Follow Up date'] || '',
        'District': l['District'],
        'Follow Up date': l['Follow Up date'],
        'Source': l['Source'],
        'Party Name': l['Party Name'],
        'Person Name': l['Person Name'],
        'Mobile No. ': l['Mobile No. '] || l['Mobile No.'],
        'Gmail ID': l['Gmail ID'],
        'Last Remarks': l['Last Remarks'],
        created_at: l['Timestamp'] || '',
        updated_at: (
          l['__col_60'] || l['__col_47'] || l['__col_33'] || l['__col_24'] || l['__col_16'] || l['Timestamp'] || ''
        ),
        owner_id: l['Sales Person Name'] || 'SYSTEM',
        
        // Lead Stage Fields
        lead_planned_date: l['__col_15'] || l['Lead Planned Date'] || l['planned_date'] || '',
        lead_actual_date: l['__col_16'] || l['Lead Actual Date'] || l['actual_date'] || '',
        lead_status: l['Lead Status'] || l['custom_status'] || '',
        product_details: l['Product details.'] || l['product_details'] || '',
        mcb_requirement: l['MCB according to requirement. Url'] || l['MCB according to requirement.'] || l['mcb_requirement'] || '',
        pain_points: l['Pain Points – Remark in detail.'] || l['pain_points'] || '',
        kit_details: l['KIT Url'] || l['KIT.'] || l['kit_details'] || '',
        meeting_followup_date: l['Meeting Follow-up Date.'] || l['meeting_followup_date'] || '',

        // Meeting Stage Fields
        meeting_planned_date: l['__col_23'] || l['Meeting Planned Date'] || l['Meeting Planned'] || '',
        meeting_actual_date: l['__col_24'] || l['Meeting Actual Date'] || l['Meeting Actual'] || '',
        meeting_status: l['Meeting Status'] || '',
        reschedule_date: l['Reschedule Meeting Date'] || '',
        discussion_points: l['Discussion Points'] || l['Discussion Points.'] || '',
        meeting_person_name: l['Meeting Person Name'] || '',
        meeting_number: l['Contact Number'] || l['Contact No'] || l['Number'] || '',
        bullet_point_remarks: l['Bullet Point Remarks'] || l['Bullet Point Remarks.'] || '',
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
        order_actual_date: l['__col_60'] || ''
      }));

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
          status: l['Stage'] || l['stage'] || l['Lead Status'] || 'COLD',
          sales_person_name: l['Sales Person Name'] || '',
          mcb_kit_url: l['MCBs. (KIT) URl'] || l['MCBs. (KIT)'] || '',
          last_remarks: l['Last Remarks'] || '',
          followup_date: l['Follow Up date'] || '',
          'District': l['District'],
          'Follow Up date': l['Follow Up date'],
          'Source': l['Source'],
          'Party Name': l['Party Name'],
          'Person Name': l['Person Name'],
          'Mobile No. ': l['Mobile No. '] || l['Mobile No.'],
          'Gmail ID': l['Gmail ID'],
          'MCBs. (KIT) URl': l['MCBs. (KIT) URl'] || l['MCBs. (KIT)'],
          'Last Remarks': l['Last Remarks'],
          created_at: l['Timestamp'] || '',
          updated_at: (
            l['__col_60'] || l['__col_47'] || l['__col_33'] || l['__col_24'] || l['__col_16'] || l['Timestamp'] || ''
          ),
          owner_id: l['Sales Person Name'] || 'SYSTEM_FMS',
          is_fms: true,
          'Entry By Id': l['Entry By Id'] || '',
          entry_by_id: l['Entry By Id'] || '',
          
          // Lead Stage Fields
          lead_planned_date: l['__col_15'] || l['Lead Planned Date'] || l['planned_date'] || '',
          lead_actual_date: l['__col_16'] || l['Lead Actual Date'] || l['actual_date'] || '',
          lead_status: l['Lead Status'] || l['custom_status'] || '',
          product_details: l['Product details.'] || l['product_details'] || '',
          mcb_requirement: l['MCB according to requirement. Url'] || l['MCB according to requirement.'] || l['mcb_requirement'] || '',
          pain_points: l['Pain Points – Remark in detail.'] || l['pain_points'] || '',
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

      leads = [...mainLeads, ...fmsLeads].filter((l: any) => l.is_deleted !== 'true' && l.is_deleted !== true);
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
    return leads;
  } catch (error: any) {
    console.error('Failed to fetch and cache Leads:', error);
    if (!LEADS_CACHE) throw error;
    return LEADS_CACHE;
  }
}

async function refreshLeadsCache(force = false) {
  const now = Date.now();
  
  if (LEADS_CACHE) {
    if (force || now - LAST_FETCH_LEADS >= LEADS_STALE_LIMIT) {
      if (!activeLeadsFetchPromise) {
        activeLeadsFetchPromise = doLeadsFetch().finally(() => {
          activeLeadsFetchPromise = null;
        });
      }
    }
    return LEADS_CACHE;
  }

  if (activeLeadsFetchPromise) return activeLeadsFetchPromise;
  
  activeLeadsFetchPromise = doLeadsFetch().finally(() => {
    activeLeadsFetchPromise = null;
  });
  return activeLeadsFetchPromise;
}

async function doUsersFetch() {
  const now = Date.now();
  console.log('Refreshing Users Cache from Sheets (Fetch)...');
  try {
    let users = [];
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SCRIPT_URL) {
      users = await SheetsDB.getRows('Login');
    } else {
      throw new Error('Google Sheets credentials (GOOGLE_SCRIPT_URL) are missing.');
    }
    USERS_CACHE = users;
    LAST_FETCH_USERS = now;
    console.log(`Users Cache refreshed: ${users.length} users`);
    return users;
  } catch (error: any) {
    console.error('Failed to fetch and cache Users:', error);
    if (!USERS_CACHE) throw error;
    return USERS_CACHE;
  }
}

async function refreshUsersCache(force = false) {
  const now = Date.now();
  
  if (USERS_CACHE) {
    if (force || now - LAST_FETCH_USERS >= USERS_STALE_LIMIT) {
      if (!activeUsersFetchPromise) {
        activeUsersFetchPromise = doUsersFetch().finally(() => {
          activeUsersFetchPromise = null;
        });
      }
    }
    return USERS_CACHE;
  }

  if (activeUsersFetchPromise) return activeUsersFetchPromise;

  activeUsersFetchPromise = doUsersFetch().finally(() => {
    activeUsersFetchPromise = null;
  });
  return activeUsersFetchPromise;
}

async function doMasterFetch() {
  const now = Date.now();
  console.log('Refreshing Master Cache from Sheets (Fetch)...');
  try {
    let data = [];
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SCRIPT_URL) {
      data = await SheetsDB.getRows('Master');
    } else {
      throw new Error('Google Sheets credentials (GOOGLE_SCRIPT_URL) are missing.');
    }
    MASTER_CACHE = data;
    LAST_FETCH_MASTER = now;
    console.log(`Master Cache refreshed: ${data.length} records`);
    return data;
  } catch (error) {
    console.error('Failed to fetch and cache Master Data:', error);
    return MASTER_CACHE || [];
  }
}

async function refreshMasterCache(force = false) {
  const now = Date.now();
  
  if (MASTER_CACHE) {
    if (force || now - LAST_FETCH_MASTER >= MASTER_STALE_LIMIT) {
      if (!activeMasterFetchPromise) {
        activeMasterFetchPromise = doMasterFetch().finally(() => {
          activeMasterFetchPromise = null;
        });
      }
    }
    return MASTER_CACHE;
  }

  if (activeMasterFetchPromise) return activeMasterFetchPromise;

  activeMasterFetchPromise = doMasterFetch().finally(() => {
    activeMasterFetchPromise = null;
  });
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
      const leads = await refreshLeadsCache();
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

          const isSubordinateOwner = leadOwnerId && subordinateIds.has(leadOwnerId);
          const isSubordinateSales = leadSalesName && subordinateNames.has(leadSalesName);

          return isOwner || isNamedSales || isSubordinateOwner || isSubordinateSales;
        });
      }
      
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
      SheetsDB.addRow('Entry Data', leadData).catch(e => console.error("Background Sheet Add Error:", e))
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

  // Leads: Create (Entry Data Special)
  app.post('/api/leads/entry', authenticateToken, async (req: any, res) => {
    try {
      const leadData = req.body;
      const entryUserId = req.user.employee_id || req.user.id || '';
      leadData['Entry By Id'] = entryUserId;
      
      // Save to 'NEW_FMS' sheet in background
      SheetsDB.addRow('NEW_FMS', leadData, 5).catch(e => console.error("Background Sheet Add Error:", e))
        .finally(() => refreshLeadsCache(true));
      
      // Update cache optimistically
      if (LEADS_CACHE) {
        const l = leadData;
        const newLead = {
          id: l.Id,
          company_name: l['Party Name'] || '',
          contact_person: l['Person Name'] || '',
          mobile: l['Mobile No. '] || '',
          email: l['Gmail ID'] || '',
          address: l['Address'] || '',
          district: l['District'] || '',
          state: l['State'] || '',
          owner_id: l['Sales Person Name'] || 'SYSTEM_FMS',
          source: l['Source'] || '',
          follow_up_date: l['Follow Up date'] || '',
          mcb_kit_url: l['MCBs. (KIT) URl'] || '',
          last_remarks: l['Last Remarks'] || '',
          status: l['Stage'] || l['stage'] || l['Lead Status'] || 'COLD',
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
          is_fms: true
        };
        LEADS_CACHE.push(newLead);
      }
      
      // Update cache in background
      refreshLeadsCache(true);

      res.status(201).json(leadData);
    } catch (error: any) {
      console.error('Entry Data creation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Leads: Update (Movement logic)
  app.patch('/api/leads/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, updated_at: new Date().toISOString() };
      
      const leads = await refreshLeadsCache();
      
      // Lead Assignment check: Only ADMIN can change owner_id
      if (updateData.owner_id && req.user.role !== 'ADMIN') {
        const existingLead = leads.find((l: any) => l.id === id);
        if (existingLead && existingLead.owner_id !== updateData.owner_id) {
          return res.status(403).json({ error: 'Only admins can reassign leads.' });
        }
      }

      // History tracking if status changed
      if (updateData.status) {
        const existingLead = leads.find((l: any) => l.id === id);
        if (existingLead && existingLead.status !== updateData.status) {
          await SheetsDB.addRow('LeadHistory', {
            id: `HIST-${Date.now()}`,
            lead_id: id,
            prev_stage: existingLead.status,
            next_stage: updateData.status,
            user_id: req.user.id,
            timestamp: new Date().toISOString(),
            remarks: updateData.remarks || 'Status change'
          });
        }
      }

      const existingLeadObj = leads.find((l: any) => l.id === id);
      const isFms = updateData.is_fms !== undefined ? updateData.is_fms : (existingLeadObj ? existingLeadObj.is_fms : true);
      const sheetName = isFms ? 'NEW_FMS' : 'Entry Data';
      const idField = 'Id';
      
      const mappedUpdate = { ...updateData };
      if (updateData.status) mappedUpdate['Stage'] = updateData.status; // Avoid collision with 'Status' which is custom_status
      if (updateData.company_name) mappedUpdate['Party Name'] = updateData.company_name;
      
      // Map Lead Stage fields
      // Do NOT map Lead Planned Date as it is formula-generated
      if (updateData.lead_actual_date !== undefined) mappedUpdate['Lead Actual Date'] = updateData.lead_actual_date;
      if (updateData.custom_status !== undefined) mappedUpdate['Lead Status'] = updateData.custom_status;
      if (updateData.lead_status !== undefined && !updateData.custom_status) mappedUpdate['Lead Status'] = updateData.lead_status;
      if (updateData.product_details !== undefined) mappedUpdate['Product details.'] = updateData.product_details;
      if (updateData.mcb_requirement !== undefined) {
        mappedUpdate['MCB according to requirement. Url'] = updateData.mcb_requirement;
        mappedUpdate['MCB according to requirement.'] = updateData.mcb_requirement; // fallback
      }
      if (updateData.pain_points !== undefined) mappedUpdate['Pain Points – Remark in detail.'] = updateData.pain_points;
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
        if (updateData.status === 'MEETING') {
          mappedUpdate['Status'] = updateData.meeting_status;
        }
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
      if (updateData.sample_actual_date !== undefined) mappedUpdate['__col_74'] = updateData.sample_actual_date;
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

      // Optimistically update the cache immediately so frontend gets instant response
      if (existingLeadObj) {
        Object.assign(existingLeadObj, updateData);
      }

      // Run Google Sheets updates in the background (fire and forget)
      (async () => {
        try {
          await SheetsDB.updateRow(sheetName, idField, id, mappedUpdate, isFms ? 5 : 0);
          
          if (updateData.meeting_status === 'Reschedule' || updateData.tech_status === 'Reschedule' || updateData.negotiation_status === 'Reschedule' || updateData.status === 'Reschedule') {
            const rescheduleData = {
              'Timestamp': new Date().toISOString(),
              'Id': id,
              'Party Name': updateData.company_name || existingLeadObj?.company_name || '',
              'Reschedule Date': updateData.reschedule_date || '',
              'Remark': updateData.custom_status || '',
              'Stage': updateData.status || existingLeadObj?.status || 'MEETING',
            };
            await SheetsDB.addRow('Reschedule', rescheduleData);
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
              await SheetsDB.addRow('Prodcut Negotiation', productData);
            }
          }
        } catch (err) {
          console.error("Background Sheet Update Error:", err);
        } finally {
          // Re-sync cache from sheets after all background updates complete
          refreshLeadsCache(true);
        }
      })();
      
      // Return instantly so UI is fast
      res.json({ success: true, ...existingLeadObj });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Leads: Delete (ADMIN and CRM role check)
  app.delete('/api/leads/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.user;
      if (role !== 'ADMIN' && role !== 'CRM') {
        return res.status(403).json({ error: 'Only ADMIN and CRM roles are allowed to delete leads.' });
      }

      const sheetName = 'Entry Data';
      await SheetsDB.updateRow(sheetName, 'Id', id, { 'is_deleted': 'true' });
      // Update cache in background
      refreshLeadsCache(true);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Followups
  app.get('/api/history/:leadId', authenticateToken, async (req, res) => {
    try {
      const history = await SheetsDB.getRows('LeadHistory');
      res.json(history.filter(h => h.lead_id === req.params.leadId));
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
      const followups = await SheetsDB.getRows('Followups');
      res.json(followups.filter(f => f.lead_id === req.params.leadId));
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
      await SheetsDB.addRow('Login', newUser);
      // Refresh cache
      refreshUsersCache(true);
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
        const rowIndex = userIndex + 2;
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
        if (scriptUrl) {
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
        }
      } else {
        console.warn('User not found in cache for PUT');
      }

      refreshUsersCache(true);
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
        const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
        if (scriptUrl) {
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
        }
      }

      refreshUsersCache(true);
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
  app.get('/api/notice', authenticateToken, async (req, res) => {
    try {
      const masterData = await refreshMasterCache();
      const selfRow = masterData.find((row: any) => {
        const src = String(row.Source || row.source || '').trim();
        return src === 'Self' || src === 'self';
      });
      console.log('[NOTICE GET] selfRow:', JSON.stringify(selfRow));
      const noticeText = selfRow ? (selfRow.Notice || selfRow.notice || '') : 'Running message to be shared through meeting – avoid sharing via WhatsApp/Email/Oral.';
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
  });
}

