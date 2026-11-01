export const EMPLOYEE_EMAIL = "renlyshillah44@gmail.com";
export const EMPLOYEE_SECTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Orders" },
  { id: "menu", label: "Menu" },
  { id: "stock", label: "Stock" },
  { id: "sales", label: "Sales Reports" },
] as const;
export type EmployeeSection = (typeof EMPLOYEE_SECTIONS)[number]["id"];
export function allowedEmployeeSections(sections: readonly string[]): EmployeeSection[] {
  return EMPLOYEE_SECTIONS.filter((s) => sections.includes(s.id)).map((s) => s.id);
}