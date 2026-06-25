const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Remove Entry Data fetch and rawMain
const fetchSectionOriginal = `      const [rawMain, fmsRows, deletedRows] = await Promise.all([
        SheetsDB.getRows('Entry Data', undefined, 0, 25000).catch(err => {
          console.warn('Leads sheet fetch failed (Entry Data):', err.message || err);
          return [];
        }),
        SheetsDB.getRows('NEW_FMS', undefined, 5, 25000).catch(err => {
          console.error('NEW_FMS fetch failed during cache refresh:', err.message);
          throw err; // Throw error so we don't wipe out the cache with an empty array!
        }),
        SheetsDB.getRows('Deleted', undefined, 0, 25000).catch(() => [])
      ]);`;

const fetchSectionReplacement = `      const [fmsRows, deletedRows] = await Promise.all([
        SheetsDB.getRows('NEW_FMS', undefined, 5, 25000).catch(err => {
          console.error('NEW_FMS fetch failed during cache refresh:', err.message);
          throw err; // Throw error so we don't wipe out the cache with an empty array!
        }),
        SheetsDB.getRows('Deleted', undefined, 0, 25000).catch(() => [])
      ]);`;
content = content.replace(fetchSectionOriginal, fetchSectionReplacement);

// 2. Remove rawMain usage
const mainLeadsOriginal = `      const mainLeads = rawMain.filter((r: any) => (r['Party Name'] || r['Id']) && String(r['Id']).trim().toLowerCase() !== 'id' && String(r['Party Name']).trim().toLowerCase() !== 'party name').map((l: any, index: number) => ({
        id: l['Id'] || \`LD-MAIN-\${index}\`,
        company_name: l['Party Name'] || '',
        contact_person: l['Person Name'] || '',
        mobile: l['Mobile No. '] || l['Mobile No.'] || '',
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
        updated_at: (l['Follow Up date'] && typeof l['Follow Up date'] === 'string' && l['Follow Up date'].length > 5) ? l['Follow Up date'] : new Date().toISOString(),
        is_fms: false,
        
        // Lead Stage Fields
        lead_planned_date: l['__col_15'] || l['Lead Planned Date'] || l['planned_date'] || '',
        lead_actual_date: l['__col_16'] || l['Lead Actual Date'] || l['actual_date'] || '',
        lead_status: l['Lead Status'] || l['custom_status'] || '',
        product_details: l['Product details.'] || l['product_details'] || '',
        mcb_requirement: l['MCB according to requirement. Url'] || l['MCB according to requirement.'] || l['mcb_requirement'] || '',
        pain_points: l['Pain Points - Remark in detail.'] || l['Pain Points'] || l['pain_points'] || '',
        kit_details: l['KIT Url'] || l['KIT.'] || l['kit_details'] || '',
        meeting_followup_date: l['Meeting Follow-up Date.'] || l['meeting_followup_date'] || '',

        // Meeting Stage Fields
        meeting_planned_date: l['__col_23'] || l['Meeting Planned Date'] || l['Meeting Planned'] || '',
        meeting_actual_date: l['__col_24'] || l['Meeting Actual Date'] || l['Meeting Actual'] || '',
        meeting_status: l['Meeting Status'] || '',
        reschedule_date: l['Reschedule Meeting Date'] || '',
        discussion_points: l['Discussion Points.'] || '',
        meeting_person_name: l['Meeting Person Name'] || '',
        meeting_number: l['Contact Number'] || l['Contact No'] || l['Number'] || '',
        bullet_point_remarks: l['Bullet Point Remarks.'] || l['Bullet Point Remarks'] || '',
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
        final_price: l['__col_51'] || l['Final Price/ Ltr'] || '',
        quantity: l['__col_52'] || l['Quantity'] || '',
        payment_terms: l['__col_53'] || l['Payment Terms'] || '',
        delivery_schedule: l['__col_54'] || l['Delivery Schedule'] || '',
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
        
        // Close Fields
        closed_at: l['__col_70'] || l['lead Closed date'] || '',
        close_reason: l['Reason'] || l['__col_71'] || '',
        close_remark: l['Remark'] || l['__col_72'] || '',
      }));`;

const mainLeadsReplacement = `      const mainLeads: any[] = [];`;

content = content.replace(mainLeadsOriginal, mainLeadsReplacement);


// 3. Extra Data Cache (Followups and LeadHistory removal)
const extraDataOriginal = `    const [followups, history, techProducts] = await Promise.all([
      SheetsDB.getRows('Followups', undefined, 0, 25000).catch(() => []),
      SheetsDB.getRows('LeadHistory', undefined, 0, 25000).catch(() => []),
      SheetsDB.getRows('Prodcut Negotiation', undefined, 0, 25000).catch(() => []),
    ]);
    EXTRA_DATA_CACHE = { followups, history, techProducts };`;

const extraDataReplacement = `    const [techProducts] = await Promise.all([
      SheetsDB.getRows('Prodcut Negotiation', undefined, 0, 25000).catch(() => []),
    ]);
    EXTRA_DATA_CACHE = { followups: [], history: [], techProducts };`;

content = content.replace(extraDataOriginal, extraDataReplacement);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Successfully updated server.ts to remove old sheets logic.');
