import { createFileRoute } from "@tanstack/react-router";

// One-time trigger. Returns 404 forever once the owner account is set up.
export const Route = createFileRoute("/api/public/admin-bootstrap")({
  server: {
    handlers: {
      POST: async () => {
        const { runAdminBootstrap, isBootstrapDone } = await import("@/lib/admin-bootstrap.server");
        if (await isBootstrapDone()) return new Response("Not found", { status: 404 });
        try {
          const r = await runAdminBootstrap();
          if (r === "already_done") return new Response("Not found", { status: 404 });
          return Response.json({ ok: r !== "not_configured", result: r });
        } catch (e) {
          console.error(e);
          return Response.json({ ok: false, error: "Bootstrap failed — check server logs." }, { status: 500 });
        }
      },
    },
  },
});
