import { config } from 'dotenv';
config();
import jwt from 'jsonwebtoken';

async function test() {
  try {
    const payload = {
      id: 'PPPL',
      email: 'admin@pppl.com',
      role: 'ADMIN',
      name: 'PPPL',
      employee_id: 'PPPL'
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
    
    const res = await fetch('http://localhost:3000/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    console.log('Data:', data.find((u: any) => u.name === 'PPPL'));
  } catch(e) {
    console.error(e);
  }
}
test();
