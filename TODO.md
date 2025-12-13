# Project TODOs

## Features

<!-- DONE: Admin: import/export user data. -->
<!-- DONE: Admin: Masquerade user. (eye logo) -->
<!-- DONE: "Why This Match" > Add a "more..." / "less..." button -->
<!-- DONE: Add a "setup Alert" button. -->
<!-- TODO: Enable batch-adding companies: From a text post -->

TODO: Support mobile
TODO: Network! WOrk your network
TODO: Evolve my profile / needs as my understanding evolves
TODO: Multiple research: My dream job is private equity and have my current research right now. (in IT - Project management) Could I manage mutliple research that are fairly different. 
TODO: "Dailies & Jobs" for new companies to consider from alerts
TODO: Extract and generate a few profiles.
TODO: Enable batch-adding companies: From a screenshot



## Improvements

<!-- DONE: LLM: Update to use the beta json "structured output". -->
<!-- DONE: Right pane: Add a search bar to research companies when looking at the full list. -->
<!-- DONE: Keyboard shortcuts: 'a' - open "add company" modal ; '/' - go to search company -->
<!-- DONE: Keyboard shortcuts: 'e' - display "explore" tab ; 'w' - display "watchlist" tab -->
<!-- DONE": Keyboard shortcuts: '?' to open modal with keyboard shortcuts -->
<!-- DONE: Keyboard shortcuts: Add link in 'settings' modal to open the keyboard shortcuts modal -->
<!-- DONE: Right Pane: Add to Watchlist: Add heart next to the company name & remove button -->
<!-- DONE: Zoom: define default zoom to view all companies --> 
<!-- DONE: Explore / Watchlist: Place new companies added better to avoid overlap -->
<!-- DONE: Explore / Watchlist: Each company is in only one of the views --> 
<!-- DONE: Explore / Watchlist: Smarter repositionning of company when transitionned from explore/watchlist view --> 
<!-- DONE: Batch Import: 25-company batch limit with graceful handling --> 
<!-- DONE: Batch Import: Support for paste from emails from LinkedIn, Glassdoor, Google Alerts, Welcome to the jungle --> 
<!-- DONE: iOS/Android: Progressive Web App: Allow "add to homescreen" --> 

<!-- DONE: --> 
<!-- DONE: --> 
<!-- DONE: --> 

TODO: Admin: Add confirmation to the delete account button

TODO: Mobile friendly UI: Users can add & review companies from their mobile. (When I'm scrolling LinkedIn and see a cool company, I want to be able to see if it's a fit for me and/or save it for later review)


TODO: Hover node: do not grey out on hover. Just on selection
TODO: Edit companies: Allow to edit companies details: website, career page...

TODO: (Maybe) Allow to manually move companies to reduce overlap

TODO: Future: Setup Alerts: Implement other ways to setup alerts for new jobs for a specific company. (E.g. Crawling or Welcmo to the jungle...)

TODO: When creating the first company set for a new user, ensure that the layout of companies looks spreads properly (no overlap...) - Naive fix: Provide the set of values to use, (angle & distance) and always use the sames for all users. 

TODO: Related Companies: Currently, the relationships between related companies are a bit random. Try to iron that out. E.g. related companies are companies in similar industry / competitors... (E.g. Fintech...) 

### Minor

FIXME: Fix the Sonner toast positionning to be centered under the tabs.


## Bug Fixes

<!-- DONE: Admin: Masquerade considers deleted companies and watchlist -->
<!-- DONE: Watchlist Right Pane: Display only companies in the Watchlist. -->
<!-- DONE: Watchlist: When adding a company from the Watchlist view, add it to the watchlist. (currently not the case) -->
<!-- DONE: When adding a new company, check if the company is already present. 1: if company already in the list (and not removed) then just state already in the list. 2: if company was removed by the user, then re-add it. (with refresh the data) -->
<!-- DONE: Explore companies: Right pane shows all companies including the ones in the watchlist -->

FIXME: Right pane: Colors for the match scores are inconsistent. They are set by the llm when logic should be centralized.
FIXME: Right pane: Company reserach buttons behave differently from action buttons
FIXME: Right pane: disappears when changing browser zoom levels
FIXME: The "Sun" node appears over the right panel


## Technical Debt

<!-- DONE: e2e tests failing inconsistently. Ensure all tests pass. -->
<!-- DONE: Setup Evals for the LLM extraction calls. (e.g. company + domain+career-page-url extraction [give a set and expected results from linkedin posts, websites...]) -->

TODO: Setup a commit hook to run tests at commit time. (husky)


## Documentation

<!-- NOTE: Need to document the company data schema -->
<!-- TODO: Create contribution guidelines for new developers -->
