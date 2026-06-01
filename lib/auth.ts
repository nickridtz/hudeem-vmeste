// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  displayName: string;
  avatar: string;        // emoji
  heightCm: number;
  startWeight: number;
  goalWeight: number;
  startDate: string;     // YYYY-MM-DD
  goalDate: string;      // YYYY-MM-DD
}

export interface User {
  id: string;
  login: string;
  passwordHash: string;
  role: "admin" | "user";
  createdAt: string;
  profile: UserProfile;
}

export interface Session {
  userId: string;
  login: string;
  role: "admin" | "user";
  displayName: string;
  avatar: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const USERS_KEY    = "hudeem_users";
const SESSION_KEY  = "hudeem_session";
const PEPPER       = "HudeemVmeste2026#salt";

// ─── Crypto ───────────────────────────────────────────────────────────────────

export async function hashPassword(password: string, login: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PEPPER}:${login.toLowerCase()}:${password}`);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── User storage ─────────────────────────────────────────────────────────────

export function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch { return []; }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ─── Admin seed ───────────────────────────────────────────────────────────────

export async function initializeAdmin(): Promise<void> {
  if (typeof window === "undefined") return;
  const users = loadUsers();
  if (users.some((u) => u.role === "admin")) return;

  const hash = await hashPassword("Rootfarx289farm!", "Nickr1dtz!");
  const admin: User = {
    id: "user-admin",
    login: "Nickr1dtz!",
    passwordHash: hash,
    role: "admin",
    createdAt: new Date().toISOString(),
    profile: {
      displayName: "Никита",
      avatar: "👑",
      heightCm: 178,
      startWeight: 120,
      goalWeight: 100,
      startDate: "2026-06-01",
      goalDate: "2026-08-31",
    },
  };
  saveUsers([admin]);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function getUserById(id: string): User | null {
  return loadUsers().find((u) => u.id === id) ?? null;
}

export function getUserByLogin(login: string): User | null {
  return loadUsers().find((u) => u.login.toLowerCase() === login.toLowerCase()) ?? null;
}

export async function createUser(
  login: string,
  password: string,
  profile: UserProfile,
  role: "admin" | "user" = "user"
): Promise<User> {
  const users = loadUsers();
  if (users.some((u) => u.login.toLowerCase() === login.toLowerCase())) {
    throw new Error("Пользователь с таким логином уже существует");
  }
  const hash = await hashPassword(password, login);
  const user: User = {
    id: crypto.randomUUID(),
    login,
    passwordHash: hash,
    role,
    createdAt: new Date().toISOString(),
    profile,
  };
  saveUsers([...users, user]);
  return user;
}

export function updateUserProfile(id: string, profile: Partial<UserProfile>): User {
  const users = loadUsers();
  const idx   = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("Пользователь не найден");
  users[idx] = { ...users[idx], profile: { ...users[idx].profile, ...profile } };
  saveUsers(users);
  return users[idx];
}

export async function changePassword(id: string, newPassword: string): Promise<void> {
  const users = loadUsers();
  const idx   = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("Пользователь не найден");
  users[idx].passwordHash = await hashPassword(newPassword, users[idx].login);
  saveUsers(users);
}

export function deleteUser(id: string): void {
  const users = loadUsers().filter((u) => u.id !== id);
  saveUsers(users);
}

// ─── Session ──────────────────────────────────────────────────────────────────

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

function setSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function logout(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(
  loginInput: string,
  password: string
): Promise<Session | null> {
  const user = getUserByLogin(loginInput);
  if (!user) return null;
  const hash = await hashPassword(password, user.login);
  if (hash !== user.passwordHash) return null;
  const session: Session = {
    userId:      user.id,
    login:       user.login,
    role:        user.role,
    displayName: user.profile.displayName,
    avatar:      user.profile.avatar,
  };
  setSession(session);
  return session;
}

// Refresh session displayName/avatar after profile update
export function refreshSession(): void {
  const session = getSession();
  if (!session) return;
  const user = getUserById(session.userId);
  if (!user) return;
  setSession({
    ...session,
    displayName: user.profile.displayName,
    avatar:      user.profile.avatar,
  });
}
