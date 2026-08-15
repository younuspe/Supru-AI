import type { MenuItemConstructorOptions } from "electron"
import type { DesktopMenuCommand, DesktopMenuTemplate } from "./ipc-contract.js"

/**
 * Turns the renderer's menu description into an Electron template, adding the two menus the
 * platform owns rather than the app: Edit, which is what binds Cmd+C/V/X and Select All on macOS,
 * and Window, which is where Minimise and Zoom are expected to be. Both are pure `role` entries —
 * Electron implements them, so they need no command ids and cannot drift.
 *
 * Kept free of `electron` runtime imports so it can be unit tested without starting an app.
 */
export function buildApplicationMenu(
  template: DesktopMenuTemplate,
  options: { appName: string; isMac: boolean; onCommand: (command: DesktopMenuCommand) => void }
): MenuItemConstructorOptions[] {
  const { appName, isMac, onCommand } = options

  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [{
        label: appName,
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" }
        ]
      }]
    : []

  const editMenu: MenuItemConstructorOptions = {
    role: "editMenu"
  }

  const windowMenu: MenuItemConstructorOptions = {
    role: "windowMenu"
  }

  const appMenus = template.map<MenuItemConstructorOptions>((menu) => ({
    label: menu.label,
    submenu: menu.items.map<MenuItemConstructorOptions>((item) => {
      if (item.kind === "separator") return { type: "separator" }
      return {
        label: item.label,
        accelerator: item.accelerator,
        enabled: item.enabled !== false,
        // A checkbox rather than a radio: the renderer sends the checked state outright, and a radio
        // group would have Electron manage a selection that is really owned by the other process.
        type: item.checked === undefined ? undefined : "checkbox",
        checked: item.checked,
        click: () => onCommand(item.command)
      }
    })
  }))

  // Platform convention puts Edit second and Window/Help last. Placing them by menu id rather than
  // by position keeps that true whatever the renderer sends, and degrades to "append" if the app's
  // menus are ever renamed.
  const fileMenus = appMenus.filter((_, index) => template[index].id === "file")
  const helpMenus = appMenus.filter((_, index) => template[index].id === "help")
  const otherMenus = appMenus.filter((_, index) => template[index].id !== "file" && template[index].id !== "help")

  return [...appMenu, ...fileMenus, editMenu, ...otherMenus, windowMenu, ...helpMenus]
}
