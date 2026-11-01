import { describe, expect, it } from "vitest";
import { EMPLOYEE_EMAIL, allowedEmployeeSections } from "@/lib/employee";
describe("employee access", () => {
  it("uses the specified employee account", () => { expect(EMPLOYEE_EMAIL).toBe("renlyshillah44@gmail.com"); });
  it("shows only owner-selected sections", () => { expect(allowedEmployeeSections(["stock", "orders"])).toEqual(["orders", "stock"]); });
  it("never exposes owner privileges as employee sections", () => { expect(allowedEmployeeSections(["settings", "admin", "pos", "delete"])).toEqual([]); });
  it("defaults to no employee access", () => { expect(allowedEmployeeSections([])).toEqual([]); });
});