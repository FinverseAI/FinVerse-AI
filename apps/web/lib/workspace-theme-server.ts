import { cookies } from "next/headers";
import { parseWorkspaceTheme, workspaceThemeCookie } from "./workspace-theme";

export async function readWorkspaceTheme() {
  return parseWorkspaceTheme((await cookies()).get(workspaceThemeCookie)?.value);
}
