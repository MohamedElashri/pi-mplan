/**
 * pi-mplan entry point: plan.md + AGENTS.md generator extension for Pi.
 *
 * Registers:
 *   - /mplan command (manual generation)
 *   - create_plan tool (agent-driven generation)
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerPimplanCommand } from "./src/commands/pimplan";
import { registerCreatePlanTool } from "./src/tools/create-plan";

export default (pi: ExtensionAPI) => {
  registerPimplanCommand(pi);
  registerCreatePlanTool(pi);
};
