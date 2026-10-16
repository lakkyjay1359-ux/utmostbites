<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Admin sales/period maths lives in src/lib/admin.ts (Nairobi UTC+3; sale = payment_status paid AND status not Cancelled) — one definition shared by dashboard, reports and tests.
- Allocate immutable integer order numbers on the first non-cancelled paid transition using a transactional database counter, not a sequence, so failed transactions consume no numbers; format all public numbers through src/lib/site.ts.
- Clipboard controls share CopyButton with a browser fallback so confirmation, tracking and admin behave consistently.
- Admin role grants and checks are enforced in the database against the verified owner's email, including auth lifecycle changes, so no browser or stale role row can bypass access restrictions.
- Stock deduction/restoration on order status change is done by the orders_stock_sync DB trigger, so it can't double-run from the UI.
