import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { SupabaseAdapter } from "@/lib/supabase-adapter";
import { getSupabase } from "@/lib/supabase";

const providers: Provider[] = [
  Resend({
    apiKey: process.env.AUTH_RESEND_KEY!,
    from: "VIMIMO <onboarding@resend.dev>",
  }),
];

// Only add Google OAuth if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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

      // Always fetch fresh credits from DB
      if (token.userId) {
        const db = getSupabase();
        const { data } = await db
          .from("users")
          .select("credits")
          .eq("id", token.userId as string)
          .single();
        token.credits = data?.credits ?? 0;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.credits = (token.credits as number) ?? 0;
      }
      return session;
    },
  },
});
