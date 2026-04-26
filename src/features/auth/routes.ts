import type { Role } from "../../shared/types/domain";

export function roleHome(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "manager":
      return "/manager/dashboard";
    case "employee":
      return "/employee/clock";
  }
}

export function appBasePath(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "manager":
      return "/manager";
    case "employee":
      return "/employee";
  }
}
