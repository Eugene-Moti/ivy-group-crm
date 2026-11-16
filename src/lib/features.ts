/**
 * Product feature switches.
 *
 * ASK_ORION_ENABLED — the AI analyst (formerly "Orion", to return as
 * "Ask Orion"). Paused while it's rebuilt: its API key expired and it
 * wasn't pulling its weight. While false, every AI surface is hidden (nav
 * item, top-bar trigger, "Ask Orion" buttons, the lead-page sidebar, the
 * Teach Orion settings tab), /orion 404s, the /api/orion/* routes refuse,
 * and the daily digest cron skips. Nothing is deleted — the code and the
 * stored business context (orion_business_context) are left intact, so
 * flipping this back to true restores everything.
 */
export const ASK_ORION_ENABLED = false;
