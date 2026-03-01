import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "vimimo",
  schemas: new Map<string, unknown>() as never,
});

// Re-export typed send helper
export type InngestClient = typeof inngest;
