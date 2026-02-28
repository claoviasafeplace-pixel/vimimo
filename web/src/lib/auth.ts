import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { SupabaseAdapter } from "@/lib/supabase-adapter";
import { getSupabase } from "@/lib/supabase";

const providers: Provider[] = [
  Resend({
    apiKey: process.env.AUTH_RESEND_KEY!,
    from: "VIMIMO <noreply@vimimo.fr>",
  }),
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;

      const db = getSupabase();
      const { data: user } = await db
        .from("users")
        .select("id, name, email, image, password_hash")
        .eq("email", email)
        .single();

      if (!user?.password_hash) return null;

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  }),
];

// Only add Google OAuth if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: SupabaseAdapter(),
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // First sign-in: capture userId
      if (user?.id) {
        token.userId = user.id;
      }

      // Always fetch fresh credits + admin status from DB
      if (token.userId) {
        const db = getSupabase();
        const { data } = await db
          .from("users")
          .select("credits, is_admin")
          .eq("id", token.userId as string)
          .single();
        token.credits = data?.credits ?? 0;
        token.isAdmin = data?.is_admin ?? false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.credits = (token.credits as number) ?? 0;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
      }
      return session;
    },
  },
});
