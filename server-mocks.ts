export const MOCK_USERS = [
  { ID: '1', Gmail: 'admin@crm.com', PASSWORD: 'password', 'USER NAME': 'Admin User', ROLE: 'ADMIN' },
  { ID: '2', Gmail: 'sales@crm.com', PASSWORD: 'password', 'USER NAME': 'Sales rep', ROLE: 'SALES' }
];

export const MOCK_LEADS = [
  { id: 'LD-1', company_name: 'Cyberdyne Systems', contact_person: 'Sarah Connor', mobile: '555-0199', email: 'sarah@cyberdyne.com', product: 'Neural Processor', source: 'Direct', priority: 'HIGH', owner_id: 'EMP001', expected_value: 150000, status: 'TECHNICAL_DISCUSSION', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LD-2', company_name: 'Stark Industries', contact_person: 'Tony Stark', mobile: '555-3000', email: 'tony@stark.com', product: 'Arc Reactor', source: 'LinkedIn', priority: 'CRITICAL', owner_id: 'EMP001', expected_value: 5000000, status: 'NEGOTIATION', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'LD-3', company_name: 'Wayne Enterprises', contact_person: 'Bruce Wayne', mobile: '555-9000', email: 'bruce@wayne.com', product: 'Security Systems', source: 'Referral', priority: 'MEDIUM', owner_id: 'EMP001', expected_value: 75000, status: 'COLD', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];
