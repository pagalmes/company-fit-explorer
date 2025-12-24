# Project TODOs

## Supporting Projects 



TODO: Setup a simple site with ability to sign-up for a wait-list. Reuse as much as possible the onboarding themes and visuals (background, fx...) 
TODO: Modify company fit explorer to Cosmos in all places
TODO: Get a domain: Cosmos.ai
TODO: Logo: Change it to reflect the "sun" visuals
TODO: iOS App Icon: Make it square. Use the same color as cosmos background. Maybe reflect the "sun" node in it.
TODO: Analytics: Implement some basic analytics to track usage of the app. 


## Features

<!-- DONE: Admin: import/export user data. -->
<!-- DONE: Admin: Masquerade user. (eye logo) -->
<!-- DONE: "Why This Match" > Add a "more..." / "less..." button -->
<!-- DONE: Add a "setup Alert" button. -->
<!-- DONE: Mobile friendly UI: Users can add & review companies from their mobile. (When I'm scrolling LinkedIn and see a cool company, I want to be able to see if it's a fit for me and/or save it for later review) -->
<!-- DONE: Enable batch-adding companies: From a text post -->
<!-- DONE: Export list - Allow to export all companies as csv, md, (notion table) json. -->
<!-- DONE: Mobile: Update UI - Company List - Feels like a Mobile App! -->
<!-- DONE: Mobile: Update UI - Company Details - Feels like a Mobile App! -->
<!-- DONE: Mobile: Update UI - Cosmos View - Feels like a Mobile App! -->


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
<!-- DONE: Hover node: do not grey out on hover. Just on selection --> 
<!-- DONE: Mobile: Click on sun to view profile. -->
<!-- DONE: Mobile: panels slide in / out animation -->
<!-- DONE: Mobile: Actions feel easy. Remove extra clicks to accomplish tasks. -->
<!-- DONE: Cosmo Login page: Update the login page to be Cosmos Themed -->


<!-- DONE: --> 
<!-- DONE: --> 

TODO: Mobile: swipe gesture to close the panels

TODO: Edit companies: Allow to edit companies details: website, career page...

TODO: (Maybe) Allow to manually move companies to reduce overlap

TODO: Future: Setup Alerts: Implement other ways to setup alerts for new jobs for a specific company. (E.g. Crawling or Welcmo to the jungle...)

TODO: When creating the first company set for a new user, ensure that the layout of companies looks spreads properly (no overlap...) - Naive fix: Provide the set of values to use, (angle & distance) and always use the sames for all users. 

TODO: Related Companies: Currently, the relationships between related companies are a bit random. Try to iron that out. E.g. related companies are companies in similar industry / competitors... (E.g. Fintech...) 

### Minor

TODO: Admin: Add confirmation to the delete account button


## Bug Fixes

<!-- DONE: Admin: Masquerade considers deleted companies and watchlist -->
<!-- DONE: Watchlist Right Pane: Display only companies in the Watchlist. -->
<!-- DONE: Watchlist: When adding a company from the Watchlist view, add it to the watchlist. (currently not the case) -->
<!-- DONE: When adding a new company, check if the company is already present. 1: if company already in the list (and not removed) then just state already in the list. 2: if company was removed by the user, then re-add it. (with refresh the data) -->
<!-- DONE: Explore companies: Right pane shows all companies including the ones in the watchlist -->
<!-- DONE: Mobile: Back button to lead you back where you were. (currently, if you click on the company from the cosmos view, it opens the company. the back button leads you to the company list view) -->
<!-- DONE: Mobile: Allow to add 1 company. (currently, can't click on it) -->
<!-- DONE: Mobile: Update UI - Support switching phone between portrait and landscape view. tab buttons move around. -->
<!-- DONE: Mobile: Update UI - Zoom more on companies when fit to view. -->
<!-- DONE: Right pane: Colors for the match scores are inconsistent. They are set by the llm when logic should be centralized. -->
<!-- DONE: Mobile: Update UI - When openin from Safari or a browser with control / search bar at the bottom, they appear over cosmos interface. -->

FIXME:
FIXME: Chrome on iOS: Buttons not showing up at the bottom. (related to 100lvh...)
FIXME: Right pane: Company research buttons behave differently from action buttons
FIXME: Right pane: disappears when changing browser zoom levels
FIXME: The "Sun" node appears over the right panel
FIXME: Fix the Sonner toast positionning to be centered under the tabs.


## Technical Debt

<!-- DONE: e2e tests failing inconsistently. Ensure all tests pass. -->
<!-- DONE: Setup Evals for the LLM extraction calls. (e.g. company + domain+career-page-url extraction [give a set and expected results from linkedin posts, websites...]) -->

TODO: Setup a commit hook to run tests at commit time. (husky)


## Documentation

<!-- NOTE: Need to document the company data schema -->
<!-- TODO: Create contribution guidelines for new developers -->
