import { createClient } from '@supabase/supabase-js';
import { stdin, stdout } from 'node:process';

const [email] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node --env-file=.env.local scripts/change-staff-password.mjs <email>');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || !stdout.isTTY) {
      reject(new Error('Run this command in an interactive terminal.'));
      return;
    }

    let value = '';
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();

    function cleanup() {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    }

    function onData(buffer) {
      for (const character of buffer.toString()) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Password change cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
        } else if (character >= ' ') {
          value += character;
        }
      }
    }

    stdin.on('data', onData);
  });
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

let user;
for (let page = 1; ; page += 1) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) {
    console.error('Could not look up staff user:', error.message);
    process.exit(1);
  }
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
  if (user || data.users.length < 1000) break;
}

if (!user) {
  console.error(`No Supabase user found for "${email}".`);
  process.exit(1);
}

const password = await readHidden('New password (12+ characters; input hidden): ');
if (password.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

const confirmation = await readHidden('Confirm new password: ');
if (password !== confirmation) {
  console.error('Passwords do not match.');
  process.exit(1);
}

const { error } = await db.auth.admin.updateUserById(user.id, { password });
if (error) {
  console.error('Could not update password:', error.message);
  process.exit(1);
}

console.log(`Password updated for ${user.email}.`);
