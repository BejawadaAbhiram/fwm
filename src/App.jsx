import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEYS = {
  users: 'foodWaste_users',
  donations: 'foodWaste_donations',
  currentUser: 'foodWaste_currentUser',
};

const STATUSES = ['Pending', 'Accepted', 'Picked Up', 'Completed', 'Rejected'];

const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getUsers = () => readStorage(STORAGE_KEYS.users, []);
const saveUsers = (users) => writeStorage(STORAGE_KEYS.users, users);
const getDonations = () => readStorage(STORAGE_KEYS.donations, []);
const saveDonations = (donations) => writeStorage(STORAGE_KEYS.donations, donations);
const getCurrentUser = () => readStorage(STORAGE_KEYS.currentUser, null);
const setCurrentUser = (user) => writeStorage(STORAGE_KEYS.currentUser, user);

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const formatDate = (date) => {
  if (!date) {
    return '-';
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString();
};

const seedData = () => {
  const users = getUsers();

  if (!users.some((user) => user.email === 'admin@foodrescue.local')) {
    users.push({
      id: 'admin-demo',
      name: 'Administrator',
      email: 'admin@foodrescue.local',
      phone: '0000000000',
      password: 'admin123',
      role: 'admin',
    });
    saveUsers(users);
  }
};

function App() {
  const [page, setPage] = useState('home');
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());
  const [users, setUsersState] = useState(() => getUsers());
  const [donations, setDonationsState] = useState(() => getDonations());

  useEffect(() => {
    seedData();
    setCurrentUserState(getCurrentUser());
    setUsersState(getUsers());
    setDonationsState(getDonations());
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const userDonations = useMemo(
    () => donations.filter((donation) => donation.userId === currentUser?.id),
    [currentUser, donations],
  );

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    setCurrentUserState(null);
    setPage('home');
  };

  const handleSignup = (formData) => {
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const password = formData.password;
    const nextUsers = getUsers();

    if (password.length < 6) {
      return { type: 'error', text: 'Password must contain at least 6 characters.' };
    }

    if (!/^\+?[0-9\s-]{10,15}$/.test(phone)) {
      return { type: 'error', text: 'Enter a valid phone number.' };
    }

    if (nextUsers.some((user) => user.email === email)) {
      return { type: 'error', text: 'An account with this email already exists.' };
    }

    const user = { id: createId('user'), name, email, phone, password, role: 'user' };
    nextUsers.push(user);
    saveUsers(nextUsers);
    setUsersState(nextUsers);
    setPage('login');

    return { type: 'success', text: 'Account created. Redirecting to login...' };
  };

  const handleLogin = (formData) => {
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;
    const user = getUsers().find((item) => item.email === email && item.password === password);

    if (!user) {
      return { type: 'error', text: 'Invalid email or password.' };
    }

    setCurrentUser(user);
    setCurrentUserState(user);
    setPage(user.role === 'admin' ? 'admin' : 'dashboard');
    return { type: 'success', text: 'Login successful.' };
  };

  const handleDonationSubmit = (formData) => {
    if (!currentUser) {
      return { type: 'error', text: 'Please log in to submit a donation.' };
    }

    const donation = {
      id: createId('donation'),
      userId: currentUser.id,
      donorName: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim().toLowerCase(),
      foodType: formData.food_type,
      foodItems: formData.food_items.trim(),
      quantity: Number(formData.quantity),
      packingAssistance: formData.packing_assistance,
      pickupAddress: formData.address.trim(),
      pickupDate: formData.pickup_date,
      pickupTime: formData.pickup_time,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    if (!/^\+?[0-9\s-]{10,15}$/.test(donation.phone)) {
      return { type: 'error', text: 'Enter a valid phone number.' };
    }

    if (!Number.isFinite(donation.quantity) || donation.quantity <= 0) {
      return { type: 'error', text: 'Quantity must be greater than zero.' };
    }

    if (donation.pickupDate < new Date().toISOString().split('T')[0]) {
      return { type: 'error', text: 'Pickup date cannot be in the past.' };
    }

    const nextDonations = [donation, ...getDonations()];
    saveDonations(nextDonations);
    setDonationsState(nextDonations);
    setPage('dashboard');

    return { type: 'success', text: 'Donation submitted successfully.' };
  };

  const handleStatusChange = (donationId, nextStatus) => {
    const nextDonations = getDonations().map((donation) =>
      donation.id === donationId ? { ...donation, status: nextStatus } : donation,
    );
    saveDonations(nextDonations);
    setDonationsState(nextDonations);
  };

  const handleDeleteDonation = (donationId) => {
    const nextDonations = getDonations().filter((donation) => donation.id !== donationId);
    saveDonations(nextDonations);
    setDonationsState(nextDonations);
  };

  const renderPage = () => {
    if (page === 'login') {
      return <LoginPage onSubmit={handleLogin} onNavigate={setPage} />;
    }

    if (page === 'signup') {
      return <SignupPage onSubmit={handleSignup} onNavigate={setPage} />;
    }

    if (page === 'donate') {
      return <DonationPage currentUser={currentUser} onSubmit={handleDonationSubmit} onNavigate={setPage} />;
    }

    if (page === 'dashboard') {
      return (
        <UserDashboard
          currentUser={currentUser}
          donations={userDonations}
          onNavigate={setPage}
          onLogout={logout}
        />
      );
    }

    if (page === 'admin') {
      return (
        <AdminDashboard
          users={users}
          donations={donations}
          onStatusChange={handleStatusChange}
          onDeleteDonation={handleDeleteDonation}
          onLogout={logout}
        />
      );
    }

    if (page === 'about') {
      return <AboutPage />;
    }

    return <HomePage onNavigate={setPage} currentUser={currentUser} onLogout={logout} />;
  };

  return (
    <>
      <Header
        page={page}
        currentUser={currentUser}
        onNavigate={setPage}
        onLogout={logout}
      />
      {renderPage()}
      <Footer />
    </>
  );
}

function Header({ page, currentUser, onNavigate, onLogout }) {
  const navLabel = currentUser ? (currentUser.role === 'admin' ? 'Admin Dashboard' : 'Dashboard') : 'Login';
  const navDestination = currentUser ? (currentUser.role === 'admin' ? 'admin' : 'dashboard') : 'login';

  return (
    <header className="site-header">
      <button type="button" className="brand" onClick={() => onNavigate('home')}>
        Food<span>Rescue</span>
      </button>
      <nav className="site-nav">
        <button type="button" className={page === 'home' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('home')}>
          Home
        </button>
        <button type="button" className={page === 'donate' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('donate')}>
          Donate Food
        </button>
        <button type="button" className={page === 'about' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('about')}>
          About
        </button>
        {!currentUser ? (
          <button type="button" className={page === 'login' ? 'nav-link active' : 'nav-link'} onClick={() => onNavigate('login')}>
            Login
          </button>
        ) : (
          <button type="button" className="nav-link" onClick={() => onNavigate(navDestination)}>
            {navLabel}
          </button>
        )}
        {currentUser && (
          <button type="button" className="nav-logout" onClick={onLogout}>
            Log out
          </button>
        )}
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span>FoodRescue | <span>{new Date().getFullYear()}</span></span>
        <span>Reducing food waste through community action</span>
      </div>
    </footer>
  );
}

function AboutPage() {
  return (
    <main className="container">
      <section className="page-intro">
        <p className="eyebrow">About the project</p>
        <h1>Food waste management starts with coordination.</h1>
        <p className="muted">FoodRescue is a simple academic project exploring how a clear donation workflow can help usable surplus food reach people who need it.</p>
      </section>
      <section className="card-grid">
        <article className="card"><h2>Our aim</h2><p>Reduce avoidable food waste and encourage responsible donation through an accessible, easy-to-understand platform.</p></article>
        <article className="card"><h2>What we do</h2><p>We collect donation details, provide pickup information, and make the progress of each record visible to its donor.</p></article>
        <article className="card"><h2>Our activities</h2><p>The demo supports account creation, donation records, status updates, and basic administration using browser storage.</p></article>
      </section>
      <section className="container">
        <div className="page-intro">
          <p className="eyebrow">Practical habits</p>
          <h2>How food waste can be reduced</h2>
        </div>
        <div className="card-grid">
          <article className="card"><h3>Plan portions</h3><p>Buy and prepare amounts that match the needs of the household or event.</p></article>
          <article className="card"><h3>Share safely</h3><p>Identify safe surplus food early and provide clear information about its contents.</p></article>
          <article className="card"><h3>Track outcomes</h3><p>Use simple records to understand what was donated and where the process can improve.</p></article>
        </div>
      </section>
      <section className="card">
        <h2>Collaborators and contributions</h2>
        <p>In a real implementation, contributors could include donors, volunteers, community groups, restaurants, and organizations working on food access. This student project does not claim partnerships with any real organization.</p>
        <p className="muted">Everyone can contribute by donating safe surplus food, sharing accurate pickup details, or helping others learn about responsible food use.</p>
      </section>
    </main>
  );
}

function HomePage({ onNavigate, currentUser, onLogout }) {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Small actions, shared impact</p>
          <h1>Turn surplus food into someone&apos;s meal.</h1>
          <p>FoodRescue helps people record safe surplus food, arrange a pickup, and keep usable food in the community.</p>
          <button type="button" className="button primary" onClick={() => onNavigate(currentUser ? 'donate' : 'signup')}>
            {currentUser ? 'Donate food' : 'Get started'}
          </button>
        </div>
        <img className="hero-image" src="/images/hero.png" alt="Fresh food prepared for sharing" />
      </section>

      <section className="container">
        <p className="eyebrow">A simple process</p>
        <h2 className="section-heading">How it works</h2>
        <div className="steps">
          <article className="step">
            <h3>Sign up</h3>
            <p>Create a local demo account to track your contributions.</p>
          </article>
          <article className="step">
            <h3>List surplus food</h3>
            <p>Share what is available and how much can be donated.</p>
          </article>
          <article className="step">
            <h3>Schedule pickup</h3>
            <p>Provide a convenient address, date, and time.</p>
          </article>
          <article className="step">
            <h3>Follow the status</h3>
            <p>See when a donation is accepted and completed.</p>
          </article>
        </div>
      </section>

      <section className="container">
        <p className="eyebrow">Why it matters</p>
        <h2 className="section-heading">Make good food count</h2>
        <div className="card-grid">
          <article className="card">
            <h3>Reduce waste</h3>
            <p>Keep safe, usable food out of the waste stream by making it visible to people who can use it.</p>
          </article>
          <article className="card">
            <h3>Build trust</h3>
            <p>Clear donation details and status updates make each contribution easier to follow.</p>
          </article>
          <article className="card">
            <h3>Support community</h3>
            <p>Simple coordination helps neighbors, volunteers, and organizations work toward a shared goal.</p>
          </article>
        </div>
      </section>

      <section className="container">
        <div className="card">
          <h2 className="section-heading">Ready to share surplus food?</h2>
          <p className="muted">Create an account and record your first donation in a few minutes.</p>
          <button type="button" className="button primary" onClick={() => onNavigate(currentUser ? 'donate' : 'signup')}>
            {currentUser ? 'Donate now' : 'Get started'}
          </button>
          {currentUser && (
            <button type="button" className="button secondary" style={{ marginLeft: '0.75rem' }} onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function LoginPage({ onSubmit, onNavigate }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = onSubmit(formData);
    setMessage(result);
  };

  return (
    <main className="container auth-layout">
      <section className="form-card auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Welcome back</p>
        <h1 id="login-title">Log in to continue</h1>
        <p className="muted">Manage your donations and help good food reach people who need it.</p>
        {message.text && <div className={`message ${message.type}`} aria-live="polite">{message.text}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" required autoComplete="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" required autoComplete="current-password" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} />
          </div>
          <button className="primary" type="submit">Log in</button>
        </form>
        <p className="muted">New here? <button type="button" className="inline-link" onClick={() => onNavigate('signup')}>Create an account</button></p>
      </section>
    </main>
  );
}

function SignupPage({ onSubmit, onNavigate }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = onSubmit(formData);
    setMessage(result);
    if (result.type === 'success') {
      setTimeout(() => onNavigate('login'), 700);
    }
  };

  return (
    <main className="container auth-layout">
      <section className="form-card auth-card" aria-labelledby="signup-title">
        <p className="eyebrow">Join the community</p>
        <h1 id="signup-title">Create your account</h1>
        <p className="muted">A simple account keeps your donation history in one place.</p>
        {message.text && <div className={`message ${message.type}`} aria-live="polite">{message.text}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="signup-name">Full name</label>
            <input id="signup-name" name="name" type="text" required autoComplete="name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="signup-email">Email</label>
            <input id="signup-email" name="email" type="email" required autoComplete="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="signup-phone">Phone</label>
            <input id="signup-phone" name="phone" type="tel" required autoComplete="tel" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="signup-password">Password</label>
            <input id="signup-password" name="password" type="password" minLength="6" required autoComplete="new-password" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} />
          </div>
          <button className="primary" type="submit">Create account</button>
        </form>
        <p className="muted">Already registered? <button type="button" className="inline-link" onClick={() => onNavigate('login')}>Log in</button></p>
      </section>
    </main>
  );
}

function DonationPage({ currentUser, onSubmit, onNavigate }) {
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    food_type: 'Veg',
    food_items: '',
    quantity: '',
    packing_assistance: 'Yes',
    address: '',
    pickup_date: '',
    pickup_time: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      name: currentUser?.name || '',
      phone: currentUser?.phone || '',
      email: currentUser?.email || '',
    }));
  }, [currentUser]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = onSubmit(formData);
    setMessage(result);
    if (result.type === 'success') {
      setTimeout(() => onNavigate('dashboard'), 700);
    }
  };

  return (
    <main className="container">
      <section className="page-intro">
        <p className="eyebrow">Share what you can</p>
        <h1>Food donation form</h1>
        <p className="muted">Tell us what is available and when it can be collected. All fields help the team plan a smooth handoff.</p>
      </section>
      <section className="form-card">
        {message.text && <div className={`message ${message.type}`} aria-live="polite">{message.text}</div>}
        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend>Donor details</legend>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Donor name</label>
                <input id="name" name="name" type="text" required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" type="tel" required value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
              </div>
              <div className="field full">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Food details</legend>
            <div className="form-grid">
              <div className="field full">
                <span className="field-label">Food type</span>
                <div className="radio-row">
                  <label><input type="radio" name="food_type" value="Veg" checked={formData.food_type === 'Veg'} onChange={(event) => setFormData({ ...formData, food_type: event.target.value })} /> Veg</label>
                  <label><input type="radio" name="food_type" value="Non-Veg" checked={formData.food_type === 'Non-Veg'} onChange={(event) => setFormData({ ...formData, food_type: event.target.value })} /> Non-Veg</label>
                  <label><input type="radio" name="food_type" value="Both" checked={formData.food_type === 'Both'} onChange={(event) => setFormData({ ...formData, food_type: event.target.value })} /> Both</label>
                </div>
              </div>
              <div className="field">
                <label htmlFor="food_items">Food items</label>
                <input id="food_items" name="food_items" type="text" placeholder="e.g. rice and vegetables" required value={formData.food_items} onChange={(event) => setFormData({ ...formData, food_items: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="quantity">Quantity</label>
                <input id="quantity" name="quantity" type="number" min="1" step="1" placeholder="Servings or boxes" required value={formData.quantity} onChange={(event) => setFormData({ ...formData, quantity: event.target.value })} />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Pickup details</legend>
            <div className="form-grid">
              <div className="field full">
                <span className="field-label">Packing assistance</span>
                <div className="radio-row">
                  <label><input type="radio" name="packing_assistance" value="Yes" checked={formData.packing_assistance === 'Yes'} onChange={(event) => setFormData({ ...formData, packing_assistance: event.target.value })} /> Yes</label>
                  <label><input type="radio" name="packing_assistance" value="No" checked={formData.packing_assistance === 'No'} onChange={(event) => setFormData({ ...formData, packing_assistance: event.target.value })} /> No</label>
                </div>
              </div>
              <div className="field full">
                <label htmlFor="address">Pickup address</label>
                <textarea id="address" name="address" rows="4" required value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pickup_date">Pickup date</label>
                <input id="pickup_date" name="pickup_date" type="date" required min={new Date().toISOString().split('T')[0]} value={formData.pickup_date} onChange={(event) => setFormData({ ...formData, pickup_date: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pickup_time">Pickup time</label>
                <input id="pickup_time" name="pickup_time" type="time" required value={formData.pickup_time} onChange={(event) => setFormData({ ...formData, pickup_time: event.target.value })} />
              </div>
            </div>
          </fieldset>

          <button className="primary" type="submit">Submit donation</button>
          <button className="secondary" type="button" onClick={() => setFormData({ ...formData, food_items: '', quantity: '', address: '', pickup_date: '', pickup_time: '' })}>Clear form</button>
        </form>
      </section>
    </main>
  );
}

function UserDashboard({ currentUser, donations, onNavigate, onLogout }) {
  const total = donations.length;
  const pending = donations.filter((donation) => donation.status === 'Pending').length;
  const completed = donations.filter((donation) => donation.status === 'Completed').length;

  return (
    <main className="container">
      <section className="dashboard-header page-intro">
        <div>
          <p className="eyebrow">Your dashboard</p>
          <h1>Welcome, <span>{currentUser?.name || 'there'}</span></h1>
          <p className="muted">Help reduce food waste, one donation at a time.</p>
        </div>
        <button type="button" className="button primary" onClick={() => onNavigate('donate')}>
          Donate surplus food
        </button>
      </section>

      <section aria-label="Donation statistics" className="stats-grid">
        <div className="stat"><span>Total donations</span><strong>{total}</strong></div>
        <div className="stat"><span>Pending</span><strong>{pending}</strong></div>
        <div className="stat"><span>Completed</span><strong>{completed}</strong></div>
      </section>

      <section>
        <h2 className="section-heading">Donation history</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Donation ID</th>
                <th>Food</th>
                <th>Quantity</th>
                <th>Pickup date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {donations.length ? donations.map((donation) => (
                <tr key={donation.id}>
                  <td>{donation.id}</td>
                  <td>{donation.foodItems}<br /><span className="muted">{donation.foodType}</span></td>
                  <td>{donation.quantity}</td>
                  <td>{formatDate(donation.pickupDate)}</td>
                  <td><span className={`status ${donation.status.toLowerCase().replace(/\s+/g, '-')}`}>{donation.status}</span></td>
                </tr>
              )) : (
                <tr><td className="empty-state" colSpan="5">You have not submitted a donation yet. Your donation history will appear here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {currentUser && (
        <div style={{ marginTop: '1rem' }}>
          <button type="button" className="button secondary" onClick={onLogout}>Log out</button>
        </div>
      )}
    </main>
  );
}

function AdminDashboard({ users, donations, onStatusChange, onDeleteDonation, onLogout }) {
  const totalUsers = users.filter((user) => user.role === 'user').length;
  const totalDonations = donations.length;
  const pending = donations.filter((donation) => donation.status === 'Pending').length;
  const completed = donations.filter((donation) => donation.status === 'Completed').length;

  return (
    <main className="container">
      <section className="page-intro">
        <p className="eyebrow">Administration</p>
        <h1>Operations dashboard</h1>
        <p className="muted">Review donation activity and keep records up to date.</p>
      </section>

      <section aria-label="Admin statistics" className="stats-grid">
        <div className="stat"><span>Registered users</span><strong>{totalUsers}</strong></div>
        <div className="stat"><span>Total donations</span><strong>{totalDonations}</strong></div>
        <div className="stat"><span>Pending</span><strong>{pending}</strong></div>
        <div className="stat"><span>Completed</span><strong>{completed}</strong></div>
      </section>

      <section>
        <h2 className="section-heading">Donation management</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Donation ID</th>
                <th>Donor</th>
                <th>Food and quantity</th>
                <th>Pickup</th>
                <th>Details</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {donations.length ? donations.map((donation) => (
                <tr key={donation.id}>
                  <td>{donation.id}</td>
                  <td>{donation.donorName}<br /><span className="muted">{donation.email}</span></td>
                  <td>{donation.foodItems}<br />{donation.quantity}</td>
                  <td>{formatDate(donation.pickupDate)}<br />{donation.pickupTime}</td>
                  <td>
                    <details>
                      <summary>View</summary>
                      <dl className="detail-list">
                        <div><dt>Phone</dt><dd>{donation.phone}</dd></div>
                        <div><dt>Food type</dt><dd>{donation.foodType}</dd></div>
                        <div><dt>Packing</dt><dd>{donation.packingAssistance}</dd></div>
                        <div><dt>Address</dt><dd>{donation.pickupAddress}</dd></div>
                      </dl>
                    </details>
                  </td>
                  <td>
                    <select value={donation.status} onChange={(event) => onStatusChange(donation.id, event.target.value)}>
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="danger" type="button" onClick={() => onDeleteDonation(donation.id)}>Delete</button>
                  </td>
                </tr>
              )) : (
                <tr><td className="empty-state" colSpan="7">No donation records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Registered users</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.filter((user) => user.role === 'user').length ? users.filter((user) => user.role === 'user').map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>{user.role}</td>
                </tr>
              )) : (
                <tr><td className="empty-state" colSpan="4">No registered users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ marginTop: '1rem' }}>
        <button type="button" className="button secondary" onClick={onLogout}>Log out</button>
      </div>
    </main>
  );
}

export default App;
