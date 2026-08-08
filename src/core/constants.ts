export const PIMPLAN_DIR = ".pi/pimplan";
export const USER_DIR = ".pi/mplan";
export const PLUGIN_NAME = "pi-mplan";
export const COMMAND_NAME = "mplan";
export const TOOL_NAME = "create_plan";

/** Recognized subcommands for `/mplan`. */
export const SUBCOMMANDS = [
  "plan",
  "agents",
  "all",
  "init",
  "scaffold",
  "help",
] as const;
export type Subcommand = (typeof SUBCOMMANDS)[number];
