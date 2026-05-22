import { config } from 'dotenv';
config();

async function test() {
  const token = process.env.ADMIN_TOKEN; // Wait, I don't have token. I will just fetch from USERS_CACHE logic.
}
