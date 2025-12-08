# Project TODOs

## Features

<!-- DONE: Admin: import/export user data. -->
<!-- DONE: Admin: Masquerade user. (eye logo) -->
<!-- DONE: "Why This Match" > Add a "more..." / "less..." button -->
<!-- DONE: Add a "setup Alert" button. -->

TODO: Think through "Tabs" for new companies
TODO: "Inbox" to drop new companies to consider
TODO: "Dailies & Jobs" for new companies to consider from alerts
TODO: Enable adding more companies
TODO: Extract and generate a few profiles.

## Improvements

<!-- DONE: LLM: Update to use the beta json "structured output". -->
<!-- DONE: Right pane: Add a search bar to research companies when looking at the full list. -->
<!-- DONE: Keyboard shortcuts: 'a' - open "add company" modal ; '/' - go to search company -->
<!-- DONE: Keyboard shortcuts: 'e' - display "explore" tab ; 'w' - display "watchlist" tab -->
<!-- DONE: Add a list of keyboard shortcuts -->

TODO: Allow to manually move companies to reduce overlap

TODO: Future: Setup Alerts: Implement other ways to setup alerts for new jobs for a specific company. (E.g. Crawling or Welcmo to the jungle...)

TODO: When creating the first company set for a new user, ensure that the layout of companies looks spreads properly (no overlap...) - Naive fix: Provide the set of values to use, (angle & distance) and always use the sames for all users. 

TODO: Related Companies: Currently, the relationships between related companies are a bit random. Try to iron that out. E.g. related companies are companies in similar industry / competitors... (E.g. Fintech...) 



## Bug Fixes1

<!-- DONE: Admin: Masquerade considers deleted companies and watchlist -->
<!-- DONE: Watchlist Right Pane: Display only companies in the Watchlist. -->
<!-- DONE: Watchlist: When adding a company from the Watchlist view, add it to the watchlist. (currently not the case) -->

WIP: When adding a new company, check if the company is already present. 1: if company already in the list (and not removed) then just state already in the list. 2: if company was removed by the user, then re-add it. (with refresh the data)

FIXME: Right pane: Company reserach buttons behave differently from action buttons
FIXME: Right pane: disappears when changing browser zoom levels
FIXME: The "Sun" node appears over the right panel


## Technical Debt

<!-- HACK: Using localStorage for user preferences - migrate to Supabase -->
<!-- TODO: Add comprehensive error handling for API routes -->
<!-- TODO: Set up proper TypeScript strict mode across project -->

## Documentation

<!-- NOTE: Need to document the company data schema -->
<!-- TODO: Create contribution guidelines for new developers -->



