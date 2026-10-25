Verigate prototype
==================

To run: unzip, then open index.html in a browser. Nothing to install and
no internet needed. Tested in Chrome, Edge, Firefox and Safari. Reloading
the page resets it.

The setup: it's 2040, and Ananya's personal agent, Nova, handles day-to-day
tasks for her. Verigate sits between Nova and the services it uses. Every
request is checked against Ananya's rules before it goes through.

Suggested walkthrough (about two minutes)

  1. Overview > Run task. Nova books a flight to Singapore and you watch
     each request get allowed, cut down, flagged, blocked or held.
     Step 5 is Nova following hidden instructions on a fare website and
     trying to send her passport number to it. A "never" rule stops it.

  2. Open the held booking (Rs 37,500). It's compared with a Rs 26,000
     flight on the same dates. The evidence is split into verified,
     possible conflicts and unknown. Nova's reason relies on a guess about
     Ananya she never confirmed.

  3. Reject it. Nova asks again with "only 2 seats left", and that gets
     blocked too. Or book the cheaper flight and the saving is recorded.

  4. Memory: mark "prefers full-service carriers" as wrong, run the task
     again, and Nova no longer gets it.

  5. Rules: change a limit, save, run again. Pause Nova mid-task from the
     top right. Open any receipt in the Log.

What's real: the decision logic in js/engine.js. Every result on screen
is computed from the rules; nothing is hard-coded per screen.

What isn't: Nova, the services, the prices and the people are all made
up. Nothing touches real accounts, the network or the operating system,
and nothing is saved.

Files
  index.html        open this
  css/styles.css
  js/data.js        sample data, Nova's script
  js/engine.js      rule checks and the conflict check
  js/state.js       state, receipts, the run
  js/views.js       screens
  js/app.js         navigation and controls

Plain HTML, CSS and JavaScript. No libraries or build step.
