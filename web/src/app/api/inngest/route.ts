import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  cleaningPoll,
  videosPoll,
  autoStaging,
  montagePoll,
  renderPoll,
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    cleaningPoll,
    videosPoll,
    autoStaging,
    montagePoll,
    renderPoll,
  ],
});
