const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `      // Map Lead Stage fields
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
      if (updateData.pain_points !== undefined) {
        mappedUpdate['__col_20'] = updateData.pain_points;
        mappedUpdate['Pain Points - Remark in detail.'] = updateData.pain_points;
        mappedUpdate['Pain Points'] = updateData.pain_points;
      }
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
      if (updateData.tech_actual_date !== undefined) {
        mappedUpdate['__col_33'] = updateData.tech_actual_date;
        mappedUpdate['Technical Discussion Actual Date'] = updateData.tech_actual_date;
        mappedUpdate['Technical Actual Date'] = updateData.tech_actual_date;
      }
      if (updateData.tech_status !== undefined) {
        mappedUpdate['__col_34'] = updateData.tech_status;
        mappedUpdate['Technical Status'] = updateData.tech_status;
      }
      if (updateData.tech_kit_url !== undefined) {
        mappedUpdate['__col_44'] = updateData.tech_kit_url;
        mappedUpdate['Kit Attachment Url'] = updateData.tech_kit_url;
      }

      // Map Negotiation Stage fields
      if (updateData.negotiation_actual_date !== undefined) {
        mappedUpdate['__col_47'] = updateData.negotiation_actual_date;
        mappedUpdate['Actual Date'] = updateData.negotiation_actual_date;
        mappedUpdate['Negotiation Actual Date'] = updateData.negotiation_actual_date;
      }
      if (updateData.negotiation_status !== undefined) {
        mappedUpdate['__col_48'] = updateData.negotiation_status;
        mappedUpdate['Status'] = updateData.negotiation_status;
      }
      if (updateData.quotation_url !== undefined) {
        mappedUpdate['__col_49'] = updateData.quotation_url;
        mappedUpdate['Quotation Upload:'] = updateData.quotation_url;
      }
      if (updateData.unit !== undefined) {
        mappedUpdate['__col_50'] = updateData.unit;
        mappedUpdate['Unit'] = updateData.unit;
      }
      if (updateData.final_price !== undefined) {
        mappedUpdate['__col_51'] = updateData.final_price;
        mappedUpdate['Final Price'] = updateData.final_price;
      }
      if (updateData.quantity !== undefined) {
        mappedUpdate['__col_52'] = updateData.quantity;
        mappedUpdate['Quantity,'] = updateData.quantity;
      }
      if (updateData.payment_terms !== undefined) {
        mappedUpdate['__col_53'] = updateData.payment_terms;
        mappedUpdate['Payment Terms'] = updateData.payment_terms;
      }
      if (updateData.delivery_schedule !== undefined) {
        mappedUpdate['__col_54'] = updateData.delivery_schedule;
        mappedUpdate['Delivery Schedule.'] = updateData.delivery_schedule;
      }
      if (updateData.party_type !== undefined) {
        mappedUpdate['__col_55'] = updateData.party_type;
        mappedUpdate['Party Type classification:'] = updateData.party_type;
      }
      if (updateData.negotiation_remark !== undefined) {
        mappedUpdate['__col_56'] = updateData.negotiation_remark;
        mappedUpdate['Remark if-Any'] = updateData.negotiation_remark;
      }
      if (updateData.negotiation_kit_url !== undefined) {
        mappedUpdate['__col_57'] = updateData.negotiation_kit_url;
        mappedUpdate['Kit Attachment'] = updateData.negotiation_kit_url;
      }

      // Map Order Stage fields
      if (updateData.order_actual_date !== undefined) {
        mappedUpdate['__col_60'] = updateData.order_actual_date;
        mappedUpdate['Order Actual Date'] = updateData.order_actual_date;
      }
      if (updateData.order_copy_url !== undefined) {
        mappedUpdate['__col_61'] = updateData.order_copy_url;
        mappedUpdate['Order Copy Upload'] = updateData.order_copy_url;
      }
      if (updateData.delivery_in !== undefined) {
        mappedUpdate['__col_62'] = updateData.delivery_in;
        mappedUpdate['Delivery in'] = updateData.delivery_in;
      }
      if (updateData.unloading !== undefined) {
        mappedUpdate['__col_63'] = updateData.unloading;
        mappedUpdate['Unloading'] = updateData.unloading;
      }
      if (updateData.motor_pump_requirement !== undefined) {
        mappedUpdate['__col_64'] = updateData.motor_pump_requirement;
        mappedUpdate['Motor / Pump Requirement'] = updateData.motor_pump_requirement;
      }
      if (updateData.transport !== undefined) {
        mappedUpdate['__col_65'] = updateData.transport;
        mappedUpdate['Transport'] = updateData.transport;
      }
      if (updateData.order_remark !== undefined) {
        mappedUpdate['__col_66'] = updateData.order_remark;
        mappedUpdate['Remark if any'] = updateData.order_remark;
      }
      if (updateData.order_attachment_url !== undefined) {
        mappedUpdate['__col_67'] = updateData.order_attachment_url;
        mappedUpdate['Attachment '] = updateData.order_attachment_url;
        mappedUpdate['Attachment'] = updateData.order_attachment_url;
      }
      if (updateData.order_status !== undefined) {
        mappedUpdate['__col_68'] = updateData.order_status;
        mappedUpdate['Order Status'] = updateData.order_status;
      }

      // Map Sample Stage fields
      if (updateData.sample_actual_date !== undefined) {
        mappedUpdate['__col_74'] = formatDateForSheet(updateData.sample_actual_date);
        mappedUpdate['Sample Actule Date'] = mappedUpdate['__col_74'];
        mappedUpdate['Sample Actual Date'] = mappedUpdate['__col_74'];
      }
      if (updateData.sample_status !== undefined) {
        mappedUpdate['__col_75'] = updateData.sample_status;
        mappedUpdate['Sample Status'] = updateData.sample_status;
      }
      if (updateData.sample_product_name !== undefined) {
        mappedUpdate['__col_76'] = updateData.sample_product_name;
        mappedUpdate['Prodcut Name'] = updateData.sample_product_name;
        mappedUpdate['Product Name'] = updateData.sample_product_name;
      }
      if (updateData.sample_qty !== undefined) {
        mappedUpdate['__col_77'] = updateData.sample_qty;
        mappedUpdate['Qty'] = updateData.sample_qty;
      }
      if (updateData.sample_dispatch_date !== undefined) {
        mappedUpdate['__col_78'] = updateData.sample_dispatch_date;
        mappedUpdate['Sample Dispach Date'] = updateData.sample_dispatch_date;
      }
      if (updateData.sample_remark !== undefined) {
        mappedUpdate['__col_79'] = updateData.sample_remark;
        mappedUpdate['Remark If-Any'] = updateData.sample_remark;
      }
      if (updateData.sample_attachment !== undefined) {
        mappedUpdate['__col_80'] = updateData.sample_attachment;
        mappedUpdate['Attachment'] = updateData.sample_attachment;
      }

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
      }`;

const regex = /      \/\/ Map Lead Stage fields[\s\S]*?mappedUpdate\['__col_72'\] = updateData\.close_remark;\n        \}\n      \}/;
if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('server.ts', content);
  console.log('Update complete!');
} else {
  console.log('Regex match failed!');
}
