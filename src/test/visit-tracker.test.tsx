// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://utmostbites.shop"}
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VisitTracker } from "@/components/site/VisitTracker";

const mocks = vi.hoisted(() => ({ path: "/", rpc: vi.fn(), execute: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useLocation: () => ({ pathname: mocks.path }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));

beforeEach(() => {
  sessionStorage.clear();
  mocks.path = "/";
  mocks.execute.mockClear();
  mocks.rpc.mockReset();
  mocks.rpc.mockImplementation(() => ({ then: (resolve: (value: { error: null }) => void) => { mocks.execute(); resolve({ error: null }); } }));
});
afterEach(cleanup);

describe("website visit recording", () => {
  it("executes the lazy database request for a real storefront visit", async () => {
    render(<VisitTracker />);
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(1));
    const saved = JSON.parse(sessionStorage.getItem("utmost-visit") ?? "null");
    expect(mocks.rpc).toHaveBeenCalledWith("record_website_visit", { _session_id: saved.id });
  });
  it("reuses the session ID when navigating without 30 minutes of inactivity", async () => {
    sessionStorage.setItem("utmost-visit", JSON.stringify({ id: "existing-session", last: Date.now() }));
    render(<VisitTracker />);
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(1));
    expect(mocks.rpc).toHaveBeenCalledWith("record_website_visit", { _session_id: "existing-session" });
  });
  it("does not record admin dashboard traffic", () => {
    mocks.path = "/admin";
    render(<VisitTracker />);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});