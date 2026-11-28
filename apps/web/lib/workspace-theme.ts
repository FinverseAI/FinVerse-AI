export const workspaceThemeCookie = "finverse-dashboard-theme";

export type WorkspaceTheme = "light" | "dark";

export function parseWorkspaceTheme(value?: string): WorkspaceTheme {
  return value === "light" ? "light" : "dark";
}
