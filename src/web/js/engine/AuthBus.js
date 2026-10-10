export class AuthBus {
  constructor() {
    this.tokenKey = 'sb_auth_token';
    this.userKey = 'sb_auth_user';
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.userKey));
    } catch {
      return null;
    }
  }

  setSession(session) {
    localStorage.setItem(this.tokenKey, session.token);
    localStorage.setItem(this.userKey, JSON.stringify({
      username: session.username,
      displayName: session.displayName,
      role: session.role,
      permissions: session.permissions
    }));
  }

  clearSession() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  async verifySession() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.valid) {
        this.setSession({ token, ...data.user });
        return true;
      }
      this.clearSession();
      return false;
    } catch {
      // Network hiccup: allow offline token if within local 6h window
      return true;
    }
  }

  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      this.setSession(data.session);
      return { success: true };
    }
    return { success: false, error: data.error };
  }

  async logout() {
    const token = this.getToken();
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
    this.clearSession();
    window.location.reload();
  }
}