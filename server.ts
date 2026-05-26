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
          console.warn('NEW_FMS fetch failed during cache refresh:', err);
          return [];
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
        status: 'COLD',
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
        created_at: l['Timestamp'] || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner_id: l['Sales Person Name'] || 'SYSTEM',
        
        // Lead Stage Fields
        lead_planned_date: l['Lead Planned Date'] || l['planned_date'] || '',
        lead_actual_date: l['Lead Actual Date'] || l['actual_date'] || '',
        lead_status: l['Lead Status'] || l['custom_status'] || '',
        product_details: l['Product details.'] || l['product_details'] || '',
        mcb_requirement: l['MCB according to requirement. Url'] || l['MCB according to requirement.'] || l['mcb_requirement'] || '',
        pain_points: l['Pain Points – Remark in detail.'] || l['pain_points'] || '',
        kit_details: l['KIT Url'] || l['KIT.'] || l['kit_details'] || '',
        meeting_followup_date: l['Meeting Follow-up Date.'] || l['meeting_followup_date'] || '',

        // Meeting Stage Fields
        meeting_planned_date: l['Meeting Planned Date'] || l['Meeting Planned'] || '',
        meeting_actual_date: l['Meeting Actual Date'] || l['Meeting Actual'] || '',
        meeting_status: l['Meeting Status'] || '',
        reschedule_date: l['Reschedule Meeting Date'] || '',
        discussion_points: l['Discussion Points.'] || '',
        meeting_person_name: l['Meeting Person Name'] || '',
        meeting_number: l['Number'] || '',
        bullet_point_remarks: l['Bullet Point Remarks.'] || '',
        meeting_url: l['Picture of Meeting Url'] || ''
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
          status: 'COLD',
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
          created_at: l['Timestamp'] || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          owner_id: l['Sales Person Name'] || 'SYSTEM_FMS',
          is_fms: true,
          
          // Lead Stage Fields
          lead_planned_date: l['Lead Planned Date'] || l['planned_date'] || '',
          lead_actual_date: l['Lead Actual Date'] || l['actual_date'] || '',
          lead_status: l['Lead Status'] || l['custom_status'] || '',
          product_details: l['Product details.'] || l['product_details'] || '',
          mcb_requirement: l['MCB according to requirement. Url'] || l['MCB according to requirement.'] || l['mcb_requirement'] || '',
          pain_points: l['Pain Points – Remark in detail.'] || l['pain_points'] || '',
          kit_details: l['KIT Url'] || l['KIT.'] || l['kit_details'] || '',
          meeting_followup_date: l['Meeting Follow-up Date.'] || l['meeting_followup_date'] || '',
  
          // Meeting Stage Fields
          meeting_planned_date: l['Meeting Planned Date'] || l['Meeting Planned'] || '',
          meeting_actual_date: l['Meeting Actual Date'] || l['Meeting Actual'] || '',
          meeting_status: l['Meeting Status'] || '',
          reschedule_date: l['Reschedule Meeting Date'] || '',
          discussion_points: l['Discussion Points.'] || '',
          meeting_person_name: l['Meeting Person Name'] || '',
          meeting_number: l['Number'] || '',
          bullet_point_remarks: l['Bullet Point Remarks.'] || '',
          meeting_url: l['Picture of Meeting Url'] || ''
        };
      });

      leads = [...mainLeads, ...fmsLeads].filter((l: any) => l.is_deleted !== 'true' && l.is_deleted !== true);
    } else {
      throw new Error('Google Sheets credentials (GOOGLE_SCRIPT_URL) are missing.');
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
  
  if (!force && LEADS_CACHE && (now - LAST_FETCH_LEADS < LEADS_STALE_LIMIT)) {
    return LEADS_CACHE;
  }

  if (activeLeadsFetchPromise) {
    return activeLeadsFetchPromise;
  }

  activeLeadsFetchPromise = (async () => {
    try {
      return await doLeadsFetch();
    } finally {
      activeLeadsFetchPromise = null;
    }
  })();

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
  
  if (!force && USERS_CACHE && (now - LAST_FETCH_USERS < USERS_STALE_LIMIT)) {
    return USERS_CACHE;
  }

  if (activeUsersFetchPromise) {
    return activeUsersFetchPromise;
  }

  activeUsersFetchPromise = (async () => {
    try {
      return await doUsersFetch();
    } finally {
      activeUsersFetchPromise = null;
    }
  })();

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
  
  if (!force && MASTER_CACHE && (now - LAST_FETCH_MASTER < MASTER_STALE_LIMIT)) {
    return MASTER_CACHE;
  }

  if (activeMasterFetchPromise) {
    return activeMasterFetchPromise;
  }

  activeMasterFetchPromise = (async () => {
    try {
      return await doMasterFetch();
    } finally {
      activeMasterFetchPromise = null;
    }
  })();

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
        profile_url: u['PROFILE URL'] || u.profile_url || ''
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
      await SheetsDB.addRow('Entry Data', leadData);
      // Update cache in background
      refreshLeadsCache(true);
      res.status(201).json(leadData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Leads: Create (Entry Data Special)
  app.post('/api/leads/entry', authenticateToken, async (req: any, res) => {
    try {
      const leadData = req.body;
      
      // Save to 'NEW_FMS' sheet
      await SheetsDB.addRow('NEW_FMS', leadData, 5);
      
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
          status: 'COLD',
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
      if (updateData.lead_planned_date !== undefined) mappedUpdate['Lead Planned Date'] = updateData.lead_planned_date;
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
        if (updateData.meeting_planned_date === undefined) {
          mappedUpdate['Meeting Planned'] = updateData.meeting_followup_date;
          mappedUpdate['Meeting Planned Date'] = updateData.meeting_followup_date;
        }
      }

      // Map Meeting Stage fields
      if (updateData.meeting_planned_date !== undefined) {
        mappedUpdate['Meeting Planned'] = updateData.meeting_planned_date;
        mappedUpdate['Meeting Planned Date'] = updateData.meeting_planned_date;
      }
      if (updateData.meeting_actual_date !== undefined) {
        mappedUpdate['Meeting Actual'] = updateData.meeting_actual_date;
        mappedUpdate['Meeting Actual Date'] = updateData.meeting_actual_date;
      }
      if (updateData.meeting_status !== undefined) {
        mappedUpdate['Status'] = updateData.meeting_status;
        mappedUpdate['Meeting Status'] = updateData.meeting_status;
      }
      if (updateData.reschedule_date !== undefined) mappedUpdate['Reschedule Meeting Date'] = updateData.reschedule_date;
      if (updateData.discussion_points !== undefined) mappedUpdate['Discussion Points.'] = updateData.discussion_points;
      if (updateData.meeting_person_name !== undefined) mappedUpdate['Meeting Person Name'] = updateData.meeting_person_name;
      if (updateData.meeting_number !== undefined) mappedUpdate['Number'] = updateData.meeting_number;
      if (updateData.bullet_point_remarks !== undefined) mappedUpdate['Bullet Point Remarks.'] = updateData.bullet_point_remarks;
      if (updateData.meeting_url !== undefined) mappedUpdate['Picture of Meeting Url'] = updateData.meeting_url;

      await SheetsDB.updateRow(sheetName, idField, id, mappedUpdate, isFms ? 5 : 0);
      
      // Log to Reschedule sheet if status is Reschedule
      if (updateData.meeting_status === 'Reschedule' || updateData.status === 'Reschedule') {
        const rescheduleData = {
          'Timestamp': new Date().toISOString(),
          'Id': id,
          'Party Name': updateData.company_name || existingLeadObj?.company_name || '',
          'Reschedule Date': updateData.reschedule_date || '',
          'Remark': updateData.custom_status || '',
          'Stage': updateData.status || existingLeadObj?.status || 'MEETING',
        };
        await SheetsDB.addRow('Reschedule', rescheduleData).catch(e => console.error("Error adding to Reschedule sheet:", e));
      }

      // Update cache in background
      refreshLeadsCache(true);
      res.json({ success: true });
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
        profile_url: u['PROFILE URL'] || u.profile_url || ''
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

