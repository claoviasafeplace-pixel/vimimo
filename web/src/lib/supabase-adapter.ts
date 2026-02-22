import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";
import { nanoid } from "nanoid";

// Lazy import to avoid build-time initialization
function db() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getSupabase } = require("./supabase") as typeof import("./supabase");
  return getSupabase();
}

export function SupabaseAdapter(): Adapter {
  return {
    async createUser(data) {
      const id = nanoid(12);
      const now = new Date().toISOString();
      const { data: user, error } = await db()
        .from("users")
        .insert({
          id,
          email: data.email,
          name: data.name ?? null,
          image: data.image ?? null,
          emailVerified: data.emailVerified?.toISOString() ?? null,
          credits: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;
      return toAdapterUser(user);
    },

    async getUser(id) {
      const { data } = await db()
        .from("users")
        .select()
        .eq("id", id)
        .single();

      return data ? toAdapterUser(data) : null;
    },

    async getUserByEmail(email) {
      const { data } = await db()
        .from("users")
        .select()
        .eq("email", email)
        .single();

      return data ? toAdapterUser(data) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const { data: account } = await db()
        .from("accounts")
        .select("userId")
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId)
        .single();

      if (!account) return null;

      const { data: user } = await db()
        .from("users")
        .select()
        .eq("id", account.userId)
        .single();

      return user ? toAdapterUser(user) : null;
    },

    async updateUser(data) {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) updates.name = data.name;
      if (data.image !== undefined) updates.image = data.image;
      if (data.email !== undefined) updates.email = data.email;
      if (data.emailVerified !== undefined)
        updates.emailVerified = data.emailVerified?.toISOString() ?? null;

      const { data: user, error } = await db()
        .from("users")
        .update(updates)
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return toAdapterUser(user);
    },

    async linkAccount(account) {
      const { error } = await db()
        .from("accounts")
        .insert({
          id: nanoid(12),
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token ?? null,
          access_token: account.access_token ?? null,
          expires_at: account.expires_at ?? null,
          token_type: account.token_type ?? null,
          scope: account.scope ?? null,
          id_token: account.id_token ?? null,
          session_state:
            (account as Record<string, unknown>).session_state as string ??
            null,
        });

      if (error) throw error;
      return account as AdapterAccount;
    },

    async createVerificationToken(data) {
      const { error } = await db()
        .from("verification_tokens")
        .insert({
          identifier: data.identifier,
          token: data.token,
          expires: data.expires.toISOString(),
        });

      if (error) throw error;
      return data;
    },

    async useVerificationToken({ identifier, token }) {
      const { data, error } = await db()
        .from("verification_tokens")
        .delete()
        .eq("identifier", identifier)
        .eq("token", token)
        .select()
        .single();

      if (error || !data) return null;
      return {
        identifier: data.identifier,
        token: data.token,
        expires: new Date(data.expires),
      };
    },

    async deleteUser(id) {
      await db().from("users").delete().eq("id", id);
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await db()
        .from("accounts")
        .delete()
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId);
    },
  };
}

function toAdapterUser(row: Record<string, unknown>): AdapterUser {
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string) ?? null,
    image: (row.image as string) ?? null,
    emailVerified: row.emailVerified
      ? new Date(row.emailVerified as string)
      : null,
  };
}
