import { createOuraSleepPeriodsRoute } from "@/lib/ouraRoute";

// Read-through cache over Oura sleep periods (multiple possible per day).
export const POST = createOuraSleepPeriodsRoute();
