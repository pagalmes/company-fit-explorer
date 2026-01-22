# Completed Tasks Archive

This file archives completed tasks from TODO.md for historical reference.

---

## MVP (Completed)

- ✅ Mobile: Remove modal (and other modals?) appear behind the "right pane"
- ✅ Analytics: Implement analytics to track app usage. (posthog) [Pierre]
- ✅ Setup a simple landing page to sign-up for the wait-list.
- ✅ Ensure Vercel, Supabase setup to limit cost blowing-up! (in particular for the waitlist) - Answer: As long as in free tier, no card is attached, so no costs are incurred. The site will just stop working if we hit the limits.
- ✅ Add a login button on the landing cosmos page. (especially for mobile)

---

## Features (Completed)

- ✅ Admin: import/export user data.
- ✅ Admin: Masquerade user. (eye logo)
- ✅ "Why This Match" > Add a "more..." / "less..." button
- ✅ Add a "setup Alert" button.
- ✅ Mobile friendly UI: Users can add & review companies from their mobile. (When I'm scrolling LinkedIn and see a cool company, I want to be able to see if it's a fit for me and/or save it for later review)
- ✅ Enable batch-adding companies: From a text post
- ✅ Export list - Allow to export all companies as csv, md, (notion table) json.
- ✅ Mobile: Update UI - Company List - Feels like a Mobile App!
- ✅ Mobile: Update UI - Company Details - Feels like a Mobile App!
- ✅ Mobile: Update UI - Cosmos View - Feels like a Mobile App!

---

## Improvements (Completed)

- ✅ LLM: Update to use the beta json "structured output".
- ✅ Right pane: Add a search bar to research companies when looking at the full list.
- ✅ Keyboard shortcuts: 'a' - open "add company" modal ; '/' - go to search company
- ✅ Keyboard shortcuts: 'e' - display "explore" tab ; 'w' - display "watchlist" tab
- ✅ Keyboard shortcuts: '?' to open modal with keyboard shortcuts
- ✅ Keyboard shortcuts: Add link in 'settings' modal to open the keyboard shortcuts modal
- ✅ Right Pane: Add to Watchlist: Add heart next to the company name & remove button
- ✅ Zoom: define default zoom to view all companies
- ✅ Explore / Watchlist: Place new companies added better to avoid overlap
- ✅ Explore / Watchlist: Each company is in only one of the views
- ✅ Explore / Watchlist: Smarter repositionning of company when transitionned from explore/watchlist view
- ✅ Batch Import: 25-company batch limit with graceful handling
- ✅ Batch Import: Support for paste from emails from LinkedIn, Glassdoor, Google Alerts, Welcome to the jungle
- ✅ iOS/Android: Progressive Web App: Allow "add to homescreen"
- ✅ Hover node: do not grey out on hover. Just on selection
- ✅ Mobile: Click on sun to view profile.
- ✅ Mobile: panels slide in / out animation
- ✅ Mobile: Actions feel easy. Remove extra clicks to accomplish tasks.
- ✅ Cosmo Login page: Update the login page to be Cosmos Themed

---

## Bug Fixes (Completed)

- ✅ Admin: Masquerade considers deleted companies and watchlist
- ✅ Watchlist Right Pane: Display only companies in the Watchlist.
- ✅ Watchlist: When adding a company from the Watchlist view, add it to the watchlist. (currently not the case)
- ✅ When adding a new company, check if the company is already present. 1: if company already in the list (and not removed) then just state already in the list. 2: if company was removed by the user, then re-add it. (with refresh the data)
- ✅ Explore companies: Right pane shows all companies including the ones in the watchlist
- ✅ Mobile: Back button to lead you back where you were. (currently, if you click on the company from the cosmos view, it opens the company. the back button leads you to the company list view)
- ✅ Mobile: Allow to add 1 company. (currently, can't click on it)
- ✅ Mobile: Update UI - Support switching phone between portrait and landscape view. tab buttons move around.
- ✅ Mobile: Update UI - Zoom more on companies when fit to view.
- ✅ Right pane: Colors for the match scores are inconsistent. They are set by the llm when logic should be centralized.
- ✅ Mobile: Update UI - When openin from Safari or a browser with control / search bar at the bottom, they appear over cosmos interface.
- ✅ Chrome on iOS: Buttons not showing up at the bottom. (related to 100lvh...)
- ✅ Right pane: disappears when changing browser zoom levels

---

## Technical Debt (Completed)

- ✅ e2e tests failing inconsistently. Ensure all tests pass.
- ✅ Setup Evals for the LLM extraction calls. (e.g. company + domain+career-page-url extraction [give a set and expected results from linkedin posts, websites...])
- ✅ Setup a commit hook to run tests at commit time. (husky)
- ✅ Update schema.sql to include the latest migration scripts

---

*Last updated: 2026-01-22*
