import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Assert only that the router mounts and paints, never page content:
// routes are rewritten as the app is built and this must keep passing.
// The root route renders a full-document shell (<html>), so assert on
// document content and router state rather than the render container.
describe("App routing", () => {
  it("renders the index route", async () => {
    const router = renderAt("/");

    await waitFor(() => expect(document.querySelector("header, main, h1")).not.toBeNull());
    expect(router.state.location.pathname).toBe("/");
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const router = renderAt("/this-route-does-not-exist");

    await waitFor(() => expect(document.querySelector("header, main, h1")).not.toBeNull());
    expect(router.state.location.pathname).toBe("/this-route-does-not-exist");
  });
});
