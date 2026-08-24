import { createOuraDailyRoute } from "@/lib/ouraRoute";

// Read-through cache: serves stored rows and fetches only uncovered dates.
export const POST = createOuraDailyRoute("daily_stress");
