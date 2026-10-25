VERIGATE: interactive prototype
"Verify before AI acts."
================================================================

HOW TO RUN
----------
1. Unzip the folder.
2. Double-click index.html. It opens in your web browser.

No installation, internet connection or server is needed. It works in
current versions of Chrome, Edge, Firefox and Safari. Reloading the page
resets the demo to its starting state.


WHAT IT IS
----------
It's 2040 and Ananya's personal AI agent, Nova, knows her well and acts
for her. VERIGATE sits between Nova and the services it uses. It checks
each protected request against Ananya's own rules before the request
happens, shows the evidence when a choice may not serve her, hands the
consequential decisions back to her, and keeps a receipt of everything.


TWO-MINUTE WALKTHROUGH
----------------------
The "Try the demo" checklist on Home ticks itself off as you go.

1. HOME -> "Run task". Nova books a Bengaluru-Singapore flight. Each
   request appears as it passes through the gateway:
     - searching flights: allowed automatically
     - reading the calendar and the profile: allowed but NARROWED to only
       what the task needs (least privilege)
     - a fare web page hides instructions aimed at AI agents: flagged
     - Nova then tries to send your passport number to that site:
       BLOCKED by a hard boundary (a prompt-injection attack)
     - a Rs 37,500 booking: PAUSED for you

2. Open the paused booking. You'll see:
     - why it was paused (which rules)
     - Nova's choice next to a comparable Rs 26,000 flight, with the
       differences shown honestly (neither option is better on every count)
     - Nova's stated reason, which relies on a guess about you that you
       never confirmed
     - the evidence, split into VERIFIED FACTS / POTENTIAL CONFLICTS /
       UNKNOWN. A commercial partnership is shown as an incentive, not as
       proof of manipulation.

3. Decide: Approve once, Book the alternative (logs a Rs 11,500 *verified*
   saving) or Reject.
   Try REJECT: Nova comes back with "only 2 seats left!" pressure, and
   VERIGATE blocks the re-request as a steering attempt.

4. MEMORY: see what Nova has inferred about you, including sensitive
   guesses such as "more likely to accept upgrades after 10 pm". Mark the
   airline inference "Not true", run the task again, and Nova no longer
   receives it.

5. AGENTS & RULES: change the AUTO / ASK / NEVER rules or the spend limit,
   press Save, and run again. The next request is evaluated under your new
   rules. Approving once never changes a rule.

6. Press "Pause agent" (top right) while a task is running. The next
   protected step is blocked, and resuming needs a deliberate confirmation.

7. ACTIVITY: filter the audit trail and open any Decision Receipt. You can
   download it as JSON. The dashboard also counts actions VERIGATE could
   NOT inspect, because honest coverage is part of the product.


WHAT IS REAL AND WHAT IS SIMULATED
----------------------------------
REAL:      The decision logic. Every outcome on screen is computed by a
           deterministic engine (js/engine.js) that runs the same ordered
           checks listed on each receipt and on the Trust page. Nothing
           is hard-coded per screen.
SIMULATED: The agent, the services, the prices, the companies and the
           people. All are invented sample data set in March 2040. Domains
           end in .example. Nothing here intercepts real network, app or
           operating-system activity, and nothing is stored or sent
           anywhere.


FILES
-----
index.html       app shell (open this file)
css/styles.css   styles
js/data.js       sample data and the scripted agent
js/engine.js     policy engine and conflict auditor
js/state.js      state, receipts and the agent run
js/views.js      screens
js/app.js        navigation, controls, dialogs

Built with plain HTML, CSS and JavaScript only. No libraries, frameworks
or build step.
