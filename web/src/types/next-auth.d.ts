import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      credits: number;
      isAdmin: boolean;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    credits?: number;
    isAdmin?: boolean;
  }
}
