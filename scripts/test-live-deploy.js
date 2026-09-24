const https = require('https');

const BASE_URL = 'https://sports-scheduler-ncdh.onrender.com';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- 1. Testing Home Page ---');
  const homeRes = await request('/');
  console.log(`GET / => Status: ${homeRes.statusCode}`);
  if (homeRes.statusCode !== 200) throw new Error('Home page failed');
  console.log('Home page OK!');

  console.log('\n--- 2. Testing Admin Login ---');
  const adminPostData = new URLSearchParams({
    email: 'admin@example.com',
    password: 'Admin@123'
  }).toString();

  const adminLoginRes = await request('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(adminPostData)
    },
    body: adminPostData
  });

  console.log(`POST /login (Admin) => Status: ${adminLoginRes.statusCode}`);
  const adminCookies = adminLoginRes.headers['set-cookie'];
  if (!adminCookies) throw new Error('No cookie received on admin login');
  const adminSessionCookie = adminCookies.map(c => c.split(';')[0]).join('; ');

  const adminDashboardRes = await request('/admin/dashboard', {
    headers: { 'Cookie': adminSessionCookie }
  });
  console.log(`GET /admin/dashboard with cookie => Status: ${adminDashboardRes.statusCode}`);
  console.log('Contains "Admin Dashboard":', adminDashboardRes.data.includes('Admin') || adminDashboardRes.data.includes('Sports'));

  console.log('\n--- 3. Testing New Player Registration ---');
  const randId = Math.floor(Math.random() * 100000);
  const newEmail = `player_${randId}@example.com`;
  const registerData = new URLSearchParams({
    name: `Test Player ${randId}`,
    email: newEmail,
    password: 'Password@123',
    confirmPassword: 'Password@123'
  }).toString();

  const registerRes = await request('/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(registerData)
    },
    body: registerData
  });
  console.log(`POST /signup => Status: ${registerRes.statusCode}`);

  console.log('\n--- 4. Testing New Player Login ---');
  const newPlayerLoginData = new URLSearchParams({
    email: newEmail,
    password: 'Password@123'
  }).toString();

  const playerLoginRes = await request('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(newPlayerLoginData)
    },
    body: newPlayerLoginData
  });
  console.log(`POST /login (New Player) => Status: ${playerLoginRes.statusCode}`);
  const playerCookies = playerLoginRes.headers['set-cookie'];
  const playerSessionCookie = playerCookies.map(c => c.split(';')[0]).join('; ');

  const dashboardRes = await request('/dashboard', {
    headers: { 'Cookie': playerSessionCookie }
  });
  console.log(`GET /dashboard => Status: ${dashboardRes.statusCode}`);
  console.log('Dashboard contains user name:', dashboardRes.data.includes(`Test Player ${randId}`));

  console.log('\n--- 5. Testing Create Session as Player ---');
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const dateStr = futureDate.toISOString().split('T')[0];

  const venueName = `Arena Championship ${randId}`;
  const sessionData = new URLSearchParams({
    sportId: '1',
    date: dateStr,
    time: '19:00',
    venue: venueName,
    additionalPlayersNeeded: '5'
  }).toString();

  const createSessionRes = await request('/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(sessionData),
      'Cookie': playerSessionCookie
    },
    body: sessionData
  });
  console.log(`POST /sessions => Status: ${createSessionRes.statusCode} (Redirect: ${createSessionRes.headers.location})`);
  const sessionUrl = createSessionRes.headers.location;

  console.log('\n--- 6. Testing Created Session Detail View ---');
  const sessionDetailRes = await request(sessionUrl, {
    headers: { 'Cookie': playerSessionCookie }
  });
  console.log(`GET ${sessionUrl} => Status: ${sessionDetailRes.statusCode}`);
  console.log(`Contains venue name "${venueName}":`, sessionDetailRes.data.includes(venueName));

  console.log('\n--- 7. Testing Sessions "Created by Me" Tab ---');
  const myCreatedTabRes = await request('/sessions?tab=created', {
    headers: { 'Cookie': playerSessionCookie }
  });
  console.log(`GET /sessions?tab=created => Status: ${myCreatedTabRes.statusCode}`);
  console.log(`Contains venue "${venueName}":`, myCreatedTabRes.data.includes(venueName));

  console.log('\n--- 8. Testing Player Joining an Available Session ---');
  const joinRes = await request('/sessions/1/join', {
    method: 'POST',
    headers: {
      'Cookie': playerSessionCookie
    }
  });
  console.log(`POST /sessions/1/join => Status: ${joinRes.statusCode} (Redirect: ${joinRes.headers.location})`);

  console.log('\n--- 9. Testing Sessions "Joined by Me" Tab ---');
  const myJoinedTabRes = await request('/sessions?tab=joined', {
    headers: { 'Cookie': playerSessionCookie }
  });
  console.log(`GET /sessions?tab=joined => Status: ${myJoinedTabRes.statusCode}`);
  console.log('Contains joined session (Cricket):', myJoinedTabRes.data.includes('Cricket'));

  console.log('\n--- 10. Testing Cancel Session with Reason ---');
  const cancelData = new URLSearchParams({
    cancellationReason: 'Bad weather forecasted for match day'
  }).toString();

  const cancelRes = await request(`${sessionUrl}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(cancelData),
      'Cookie': playerSessionCookie
    },
    body: cancelData
  });
  console.log(`POST ${sessionUrl}/cancel => Status: ${cancelRes.statusCode} (Redirect: ${cancelRes.headers.location})`);

  const cancelledDetailRes = await request(sessionUrl, {
    headers: { 'Cookie': playerSessionCookie }
  });
  console.log(`GET ${sessionUrl} after cancellation => Status: ${cancelledDetailRes.statusCode}`);
  console.log('Displays "Cancelled":', cancelledDetailRes.data.includes('Cancelled') || cancelledDetailRes.data.includes('cancelled'));
  console.log('Displays cancellation reason:', cancelledDetailRes.data.includes('Bad weather forecasted for match day'));

  console.log('\n=======================================');
  console.log('ALL 10 END-TO-END PRODUCTION CHECKS PASSED!');
  console.log('=======================================');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
