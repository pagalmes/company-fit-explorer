# Project TODOs

## Features

<!-- TODO: Add user authentication with social login providers -->
<!-- TODO: Implement company comparison side-by-side view -->
<!-- TODO: Add export functionality for saved company lists -->
<!-- TODO: Create onboarding tutorial for new users -->

DONE: Admin: import/export user data.
DONE: Admin: Masquerade user. (eye logo)
DONE: "Why This Match" > Add a "more..." / "less..." button

DONE: Add a "setup Alert" button.

TODO: Think through "Tabs" for new companies
TODO: "Inbox" to drop new companies to consider
TODO: "Dailies & Jobs" for new companies to consider from alerts
TODO: Enable adding more companies
TODO: Extract and generate a few profiles.

TODO: 
TODO: 
TODO: 

## Improvements

<!-- TODO: Optimize graph rendering performance for 1000+ nodes -->
<!-- TODO: Add dark mode theme support -->
<!-- TODO: Implement keyboard shortcuts for navigation -->

TODO: Right pane: Add a search bar to research companies when looking at the full list.

TODO: Setup Alerts: Implement other ways to setup alerts for new jobs for a specific company.

TODO: When creating the first company set for a new user, ensure that the layout of companies looks spreads properly (no overlap...) - Naive fix: Provide the set of values to use, (angle & distance) and always use the sames for all users. 

TODO: Related Companies: Currently, the relationships between related companies are a bit random. Try to iron that out. E.g. related companies are companies in similar industry / competitors... (E.g. Fintech...) 




## Bug Fixes1

DONE: Admin: Masquerade not taking into account deleted companies nor watchlist

DONE: Watchlist Right Pane: Currently, it displays the full list fo companies. It does not filter out to only display companies in the Watchlist.

DONE: When adding a company from the Watchlist, add the company and add it directly to the watch list.

FIXME: When adding a new company, check if the company is already. For companies previously removed by the user, consider if we should just show it again. (or should we re-do the full fetch as a new company) - 1: if company already in the list (and not removed) then just state already in the list. 2: if company was removed by the user, then re-add it. (just remove it from the "removed" list)

FIXME: Right pane: Company reserach buttons behave differently from action buttons
FIXME: Right pane: disappears when changing browser zoom levels
FIXME: The "Sun" node appears over the right panel


<!-- FIXME: Graph layout sometimes overlaps nodes on mobile -->
<!-- FIXME: Search bar doesn't clear filters on reset -->

## Technical Debt

<!-- HACK: Using localStorage for user preferences - migrate to Supabase -->
<!-- TODO: Add comprehensive error handling for API routes -->
<!-- TODO: Set up proper TypeScript strict mode across project -->

## Documentation

<!-- NOTE: Need to document the company data schema -->
<!-- TODO: Create contribution guidelines for new developers -->

---

**Usage:**
- Add items using HTML comment format: `<!-- TODO: Your task here -->`
- Todo Tree extension will detect and display these in the sidebar
- Use tags: TODO, FIXME, HACK, NOTE, BUG

