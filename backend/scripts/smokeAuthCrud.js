const { spawn } = require('child_process');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  const server = spawn('node', ['src/app.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '5001' },
    stdio: 'pipe',
  });

  let logs = '';
  server.stdout.on('data', (d) => {
    logs += d.toString();
  });
  server.stderr.on('data', (d) => {
    logs += d.toString();
  });

  const req = async (url, opts = {}) => {
    const response = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    const raw = await response.text();
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = { raw };
    }
    return { status: response.status, body };
  };

  try {
    await wait(5000);

    const base = 'http://localhost:5001/api';
    const rootEmail = process.env.ROOT_ADMIN_EMAIL || 'root.admin@ecommerce.local';
    const rootPassword = process.env.ROOT_ADMIN_PASSWORD || 'RootAdmin@123';
    const suffix = Date.now();
    const results = [];
    const pushResult = (name, res) => {
      results.push({
        name,
        status: res.status,
        message: res.body?.message,
        errors: res.body?.errors,
      });
    };

    const adminLogin = await req(`${base}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: rootEmail, password: rootPassword }),
    });
    pushResult('admin login', adminLogin);
    if (adminLogin.status !== 200) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.body)}`);
    }

    const adminToken = adminLogin.body?.data?.token;
    const me = await req(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    pushResult('admin me', me);
    const rootId = me.body?.data?.id;

    const adminLogout = await req(`${base}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    pushResult('admin logout', adminLogout);

    const roleRegister = await req(`${base}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Hack Admin',
        email: `hackadmin_${suffix}@mail.com`,
        password: 'Aa123456',
        role: 'admin',
      }),
    });
    pushResult('register admin forbidden', roleRegister);

    const customerEmail = `customer_${suffix}@mail.com`;
    const customerPassword = 'Aa123456';

    const registerCustomer = await req(`${base}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Customer Test',
        email: customerEmail,
        password: customerPassword,
        phone: '0900000000',
      }),
    });
    pushResult('customer register', registerCustomer);

    const customerLogin = await req(`${base}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: customerEmail, password: customerPassword }),
    });
    pushResult('customer login', customerLogin);
    const customerToken = customerLogin.body?.data?.token;

    const updateProfile = await req(`${base}/auth/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ name: 'Customer Updated', phone: '0911111111' }),
    });
    pushResult('customer update profile', updateProfile);

    const changePassword = await req(`${base}/auth/password`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({ currentPassword: customerPassword, newPassword: 'Bb123456' }),
    });
    pushResult('customer change password', changePassword);

    const relogin = await req(`${base}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: customerEmail, password: 'Bb123456' }),
    });
    pushResult('customer login new password', relogin);

    const adminLogin2 = await req(`${base}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: rootEmail, password: rootPassword }),
    });
    const adminToken2 = adminLogin2.body?.data?.token;

    const rootProfileEdit = await req(`${base}/auth/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken2}` },
      body: JSON.stringify({ name: 'Root Changed' }),
    });
    pushResult('root edit profile blocked', rootProfileEdit);

    const rootPasswordEdit = await req(`${base}/auth/password`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken2}` },
      body: JSON.stringify({ currentPassword: rootPassword, newPassword: 'Cc123456' }),
    });
    pushResult('root change password blocked', rootPasswordEdit);

    const staffEmail = `staff_${suffix}@mail.com`;
    const createStaff = await req(`${base}/users/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken2}` },
      body: JSON.stringify({ name: 'Staff Test', email: staffEmail, password: 'Aa123456' }),
    });
    pushResult('create staff', createStaff);

    const staffId = createStaff.body?.data?.id;
    const updateStaff = await req(`${base}/users/${staffId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken2}` },
      body: JSON.stringify({ name: 'Staff Updated', isActive: true }),
    });
    pushResult('update staff', updateStaff);

    const deactivateStaff = await req(`${base}/users/${staffId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken2}` },
    });
    pushResult('deactivate staff', deactivateStaff);

    const deleteRoot = await req(`${base}/users/${rootId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken2}` },
    });
    pushResult('delete root blocked', deleteRoot);

    console.log(
      JSON.stringify(
        {
          ok: true,
          results,
          checks: {
            registerAdminBlocked: roleRegister.status,
            rootProfileBlocked: rootProfileEdit.status,
            rootPasswordBlocked: rootPasswordEdit.status,
            rootDeleteBlocked: deleteRoot.status,
          },
        },
        null,
        2
      )
    );
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: error.message, logs }, null, 2));
  } finally {
    server.kill('SIGINT');
    await wait(1000);
  }
};

run();
