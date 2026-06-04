import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  displayName: string;
  avatar: string;
  heightCm: number;
  startWeight: number;
  goalWeight: number;
  startDate: string;
  goalDate: string;
  age: number;
  gender: "male" | "female";
  activityLevel: number; // 1.2 – 1.9
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

// ─── Row ↔ Type mapping ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToUser(r: any): User {
  return {
    id: r.id,
    login: r.login,
    passwordHash: r.password_hash,
    role: r.role,
    createdAt: r.created_at,
    profile: {
      displayName:   r.display_name,
      avatar:        r.avatar,
      heightCm:      Number(r.height_cm),
      startWeight:   Number(r.start_weight),
      goalWeight:    Number(r.goal_weight),
      startDate:     String(r.start_date).split("T")[0],
      goalDate:      String(r.goal_date).split("T")[0],
      age:           Number(r.age ?? 25),
      gender:        (r.gender ?? "male") as "male" | "female",
      activityLevel: Number(r.activity_level ?? 1.55),
    },
  };
}

// ─── Crypto ───────────────────────────────────────────────────────────────────

const PEPPER = "HudeemVmeste2026#salt";

export async function hashPassword(password: string, login: string): Promise<string> {
  const encoder = new TextEncoder();
  const data    = encoder.encode(`${PEPPER}:${login.toLowerCase()}:${password}`);
  const buf     = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Admin seed ───────────────────────────────────────────────────────────────

export async function initializeAdmin(): Promise<void> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (error) console.error("[auth] initializeAdmin check error:", error.message, error.code);
  if (data && data.length > 0) return;

  const hash = await hashPassword("Rootfarx289farm!", "Nickr1dtz!");
  await supabase.from("users").insert({
    id:           "user-admin",
    login:        "Nickr1dtz!",
    password_hash: hash,
    role:         "admin",
    display_name: "Никита",
    avatar:       "👑",
    height_cm:    178,
    start_weight: 120,
    goal_weight:  100,
    start_date:   "2026-06-01",
    goal_date:    "2026-08-31",
  });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function loadUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("users").select("*").order("created_at");
  if (error) { console.error(error); return []; }
  return (data ?? []).map(rowToUser);
}

export async function getUserById(id: string): Promise<User | null> {
  const { data } = await supabase.from("users").select("*").eq("id", id).single();
  return data ? rowToUser(data) : null;
}

export async function getUserByLogin(login: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("login", login)
    .single();
  if (error) console.error("[auth] getUserByLogin error:", error.message, error.code);
  return data ? rowToUser(data) : null;
}

export async function createUser(
  login: string,
  password: string,
  profile: UserProfile,
  role: "admin" | "user" = "user"
): Promise<User> {
  const existing = await getUserByLogin(login);
  if (existing) throw new Error("Пользователь с таким логином уже существует");

  const hash = await hashPassword(password, login);
  const { data, error } = await supabase
    .from("users")
    .insert({
      login,
      password_hash: hash,
      role,
      display_name:  profile.displayName,
      avatar:        profile.avatar,
      height_cm:     profile.heightCm,
      start_weight:  profile.startWeight,
      goal_weight:   profile.goalWeight,
      start_date:    profile.startDate,
      goal_date:     profile.goalDate,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToUser(data);
}

export async function updateUserProfile(
  id: string,
  profile: Partial<UserProfile>
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (profile.displayName   !== undefined) update.display_name    = profile.displayName;
  if (profile.avatar        !== undefined) update.avatar          = profile.avatar;
  if (profile.heightCm      !== undefined) update.height_cm       = profile.heightCm;
  if (profile.startWeight   !== undefined) update.start_weight    = profile.startWeight;
  if (profile.goalWeight    !== undefined) update.goal_weight     = profile.goalWeight;
  if (profile.startDate     !== undefined) update.start_date      = profile.startDate;
  if (profile.goalDate      !== undefined) update.goal_date       = profile.goalDate;
  if (profile.age           !== undefined) update.age             = profile.age;
  if (profile.gender        !== undefined) update.gender          = profile.gender;
  if (profile.activityLevel !== undefined) update.activity_level  = profile.activityLevel;
  await supabase.from("users").update(update).eq("id", id);
}

export async function changePassword(id: string, newPassword: string): Promise<void> {
  const { data } = await supabase.from("users").select("login").eq("id", id).single();
  if (!data) return;
  const hash = await hashPassword(newPassword, data.login);
  await supabase.from("users").update({ password_hash: hash }).eq("id", id);
}

export async function deleteUser(id: string): Promise<void> {
  await supabase.from("users").delete().eq("id", id);
}

// ─── Session (localStorage) ───────────────────────────────────────────────────

const SESSION_KEY = "hudeem_session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

function setSession(s: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function logout(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

export async function login(loginInput: string, password: string): Promise<Session | null> {
  const user = await getUserByLogin(loginInput);
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

export async function refreshSession(): Promise<void> {
  const session = getSession();
  if (!session) return;
  const user = await getUserById(session.userId);
  if (!user) return;
  setSession({ ...session, displayName: user.profile.displayName, avatar: user.profile.avatar });
}
