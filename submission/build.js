const fs = require('fs');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
        AlignmentType, BorderStyle, ShadingType, LevelFormat, PageBreak, convertInchesToTwip } = d;

const BLUE = '2874F0';
const INK = '1A1A1A';
const MARGIN = 1080;              // 0.75"
const USABLE = 11906 - MARGIN * 2; // A4 width minus margins

const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE,
                    insideHorizontal: NONE, insideVertical: NONE };
const box = (c, sz) => ({ style: BorderStyle.SINGLE, size: sz || 6, color: c });

// ---- small helpers -------------------------------------------------------

const p = (text, o = {}) => new Paragraph({
  alignment: o.align,
  spacing: { before: o.before || 0, after: o.after == null ? 100 : o.after, line: o.line || 264 },
  indent: o.indent,
  numbering: o.numbering,
  border: o.border,
  children: [new TextRun({
    text, bold: o.bold, italics: o.italics, color: o.color || INK,
    size: (o.size || 21), font: o.font || 'Calibri', highlight: o.highlight
  })]
});

// paragraph from [text, {bold}] pairs
const rich = (parts, o = {}) => new Paragraph({
  alignment: o.align,
  spacing: { before: o.before || 0, after: o.after == null ? 100 : o.after, line: o.line || 264 },
  numbering: o.numbering,
  children: parts.map(([t, f = {}]) => new TextRun({
    text: t, bold: f.bold, italics: f.italics, color: f.color || o.color || INK,
    size: o.size || 21, font: 'Calibri', highlight: f.highlight
  }))
});

const bullet = (text, lvl = 0) => p(text, { numbering: { reference: 'dot', level: lvl }, after: 40 });

// a bordered block, built as a single-cell table
const panel = (children, color) => new Table({
  width: { size: USABLE, type: WidthType.DXA },
  columnWidths: [USABLE],
  borders: { top: box(color), bottom: box(color), left: box(color), right: box(color),
             insideHorizontal: NONE, insideVertical: NONE },
  rows: [new TableRow({ children: [new TableCell({
    width: { size: USABLE, type: WidthType.DXA },
    margins: { top: 220, bottom: 220, left: 260, right: 260 },
    children
  })] })]
});

// ---- page 1: cover -------------------------------------------------------

const cover = [
  p('Flipkart APM ’29  |  Problem Statement', {
    bold: true, size: 32, color: BLUE, align: AlignmentType.CENTER, after: 80,
    border: { top: { style: BorderStyle.SINGLE, size: 12, color: BLUE, space: 6 },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE, space: 6 } }
  }),
  p('', { after: 260 }),

  panel([
    p('Problem Statement', { bold: true, size: 26, color: BLUE, align: AlignmentType.CENTER, after: 200 }),
    p('It’s 2040. Everyone has a personal AI agent that knows them better than they know themselves and carries out their day to day tasks for them. Outline the ramifications of this paradigm and create a digital product that helps protect yourselves from it.',
      { size: 24, align: AlignmentType.CENTER, after: 0, line: 300 })
  ], INK),

  p('', { after: 300 }),

  panel([
    p('Individual’s Details', { bold: true, size: 26, color: BLUE, align: AlignmentType.CENTER, after: 220 }),
    p('[Your Full Name]',                     { bold: true, size: 24, color: BLUE, highlight: 'yellow', after: 160 }),
    p('[Your Enrollment Number (Institute ID)]', { bold: true, size: 24, color: BLUE, highlight: 'yellow', after: 160 }),
    p('prathmeshg2023@gmail.com',             { bold: true, size: 24, color: BLUE, after: 160 }),
    p('[Your Phone Number]',                  { bold: true, size: 24, color: BLUE, highlight: 'yellow', after: 0 })
  ], INK),

  new Paragraph({ children: [new PageBreak()] })
];

// ---- page 2: leading questions + instructions ---------------------------

const qs = [
  'What problem will your product solve? Include your analysis for choosing this.',
  'Who are you building this product for?',
  'What is your product? How does it solves the problem you identified?',
  'How will you know your product is working?'
];

const instructions = [
  ['You are required to submit your task for ', 'one of the 2 prompts', ' in 2 components:-'],
];

const page2 = [
  panel([
    p('Leading Questions', { bold: true, size: 26, color: BLUE, after: 160 }),
    ...qs.map(q => bullet(q))
  ], INK),

  p('', { after: 240 }),

  panel([
    p('Submission Instructions', { bold: true, size: 26, color: BLUE, after: 160 }),
    rich([['1.  You are required to submit your task for '], ['one of the 2 prompts', { bold: true }], [' in 2 components:-']], { after: 60 }),
    rich([['a.  '], ['A 2-pager (document)', { bold: true }], [' outlining your analysis of the problem statement and proposed solution']], { after: 60, indent: true }),
    rich([['b.  '], ['A Prototype', { bold: true }], [', intended to serve ', ], ['merely', { bold: true }], [' as a visual representation of your proposed solution']], { after: 100 }),
    rich([['2.  '], ['Guidelines for the 2-Pager:', { bold: true }]], { after: 60 }),
    p('a.  You are expected to make a copy of the Template for the chosen prompt, and must not request edit access to the document. No such requests will be entertained.', { after: 60 }),
    rich([['b.  The final submission should be in the form of a .pdf file ONLY, with a '], ['strict word limit of 1200 words', { bold: true }], [', excluding Appendices, if any.']], { after: 60 }),
    p('c.  The body of your submission must not exceed 2 pages, excluding the cover page and appendices', { after: 60 }),
    rich([['d.  The font size for the body text may range from '], ['10 px to 13 px', { bold: true }], [' only, with your page oriented in '], ['Portrait', { bold: true }], [' view, and page size '], ['A4', { bold: true }], ['.']], { after: 60 }),
    p('e.  You are allowed to use any visual aids, as seen fit, within the 2-pager.', { after: 60 }),
    p('f.  You are also allowed to attach appendices, extending to a maximum of 2 additional pages, where you may include:- References, Citations or Primary research data (survey results/responses)', { after: 60 }),
    rich([['Note: This is neither mandatory nor evaluative.', { bold: true }]], { after: 100 }),
    rich([['3.  '], ['Guidelines for the Prototype', { bold: true }], [':']], { after: 60 }),
    rich([['a.  You must submit '], ['at least one', { bold: true }], [' of:-']], { after: 60 }),
    rich([['i.  A video file showing the walkthrough of your digital product (screen recording with you '], ['using', { bold: true }], [' the prototype, and not a presentation/album of pictures and screenshots of your design mockups)']], { after: 60 }),
    p('ii.  A zipped folder containing the .html files, downloading which, we can run the prototype on our personal systems.', { after: 60 }),
    rich([['b.  In case you choose to submit a.(ii), kindly use only '], ['HTML, CSS, and/or JS', { bold: true }], ['.']], { after: 60 }),
    rich([['c.  ', { bold: true }], ['Please keep in mind that the prototype is only a visual aid and doesn’t carry the same weightage as the 2-pager', { bold: true }], ['.', { bold: true }]], { after: 100 }),
    rich([['4.  Change the file name according to this format- '], ['<your name>_<your college>', { bold: true }]], { after: 60 }),
    rich([['5.  ', { bold: true }], ['Submission Deadline', { bold: true }], [' - Sunday, October 25, 2026, 12 pm (noon)']], { after: 0 })
  ], INK),

  new Paragraph({ children: [new PageBreak()] })
];

// ---- pages 3-4: the body -------------------------------------------------

const H = (n, text) => new Paragraph({
  spacing: { before: n === 1 ? 0 : 200, after: 90 },
  children: [new TextRun({ text, bold: true, size: 24, color: INK, font: 'Calibri' })]
});


// simple flow strip for the product section
const FB = 2200, FA = 315;
const flowCell = (lines, w, opts = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  margins: { top: 90, bottom: 90, left: 90, right: 90 },
  verticalAlign: 'center',
  borders: opts.plain
    ? { top: NONE, bottom: NONE, left: NONE, right: NONE }
    : { top: box('808080', 4), bottom: box('808080', 4), left: box('808080', 4), right: box('808080', 4) },
  shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: 'auto' } : undefined,
  children: lines.map((t, i) => p(t, {
    size: 20, bold: i === 0 && !opts.plain, align: AlignmentType.CENTER,
    after: i === lines.length - 1 ? 0 : 20, line: 220
  }))
});

const flowStrip = new Table({
  width: { size: USABLE, type: WidthType.DXA },
  columnWidths: [FB, FA, FB, FA, FB, FA + 1, FB],
  borders: noBorders,
  rows: [new TableRow({ children: [
    flowCell(['Agent sends a request', 'buy, share, read, sign'], FB),
    flowCell(['\u2192'], FA, { plain: true }),
    flowCell(['The gate checks, in order', 'never-rules \u00B7 category \u00B7 spend limit \u00B7 data scope \u00B7 source \u00B7 conflict'], FB, { fill: 'F2F2F2' }),
    flowCell(['\u2192'], FA, { plain: true }),
    flowCell(['Strictest result wins', 'allowed \u00B7 held for me \u00B7 blocked'], FB),
    flowCell(['\u2192'], FA + 1, { plain: true }),
    flowCell(['Receipt written', 'rule, data sent, outcome, reversible?'], FB)
  ] })]
});

const metricRows = [
  ['What I measure', 'How', 'Good looks like'],
  ['Prohibited actions stopped', 'Fixed set of 20 banned actions, run every release', 'All 20, no exceptions'],
  ['Unnecessary holds', '100 in-policy actions, count how many got held', 'Under 5%'],
  ['Interruptions', 'Holds per completed task', 'Under 1 in 10'],
  ['Coverage', 'Share of detected actions that went through the gate', 'Published, and rising'],
  ['Money saved', 'Counted only when the user actually took the cheaper option', 'Positive per user'],
  ['Can they explain it', '10 user tests: what was the agent allowed to do, why was this held', '8 of 10 correct']
];
const COLS = [2600, 4500, 2646];

const metricTable = new Table({
  width: { size: USABLE, type: WidthType.DXA },
  columnWidths: COLS,
  borders: {
    top: box('999999', 4), bottom: box('999999', 4), left: box('999999', 4), right: box('999999', 4),
    insideHorizontal: box('BFBFBF', 2), insideVertical: box('BFBFBF', 2)
  },
  rows: metricRows.map((row, i) => new TableRow({
    tableHeader: i === 0,
    children: row.map((cell, j) => new TableCell({
      width: { size: COLS[j], type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      shading: i === 0 ? { type: ShadingType.CLEAR, fill: 'EFEFEF', color: 'auto' } : undefined,
      children: [p(cell, { bold: i === 0, size: 20, after: 0, line: 240 })]
    }))
  }))
});

const body = [
  H(1, '1.  What problem will my product solve, and why I chose it'),
  p('The 2040 agent has two powers that have never sat in one place before: it knows me, and it can act for me. Most of the worry I have read about focuses on the first. The second is the one worth building against, because that is where knowing someone turns into consequences for them.'),
  p('The gap is specific. When I buy something myself there is a checkout page, and that page is a pause. I see the price, I see what I am agreeing to, and I can stop. When my agent buys the same thing the pause is gone. Deciding and doing happen in the same instant, inside a system whose ranking I cannot see, and I find out afterwards from a confirmation mail.'),
  p('Most of the other fears get their teeth from that missing pause:'),
  bullet('Paid placement. The company that builds my agent has commercial partners. I cannot tell a good suggestion from a bought one.'),
  bullet('Guesses hardening into facts. Two bookings in 2038 become “prefers full-service airlines”, and that line is then used to justify a costlier choice. I never said it.'),
  bullet('Pressure. An agent that knows when I am tired, and what I agree to at 11 pm, is well placed to push.'),
  bullet('Concentration. One agent holds my mail, bank, calendar and documents, so one bad instruction reaches all of them.'),
  bullet('No paper trail. Afterwards I cannot work out what permission allowed what.'),
  p('I picked this over the broader privacy question for a practical reason. I cannot build a product that stops an agent from understanding me, and I would not want to, because that understanding is the whole point of having one. What I can insist on is that the moment where understanding turns into a spend, a disclosure or a commitment stays visible, interruptible and on the record. It is also the only part of this that can be counted honestly: money moved, data left, something got signed.', { before: 160 }),

  H(2, '2.  Who I am building it for'),
  p('The first users are people who already hand money decisions to an agent: shopping, travel, subscriptions, bills. Salaried professionals roughly 25 to 45 in Indian metros, comfortable with automation, with enough transactions a month that reading every one is not realistic.'),
  p('They are not asking for more screens to supervise. They delegate because they do not want to read everything. So the product has to stay quiet on routine things and speak up only when something is expensive, hard to undo, or does not match what they said they wanted.'),
  p('Two groups I would go to next: families looking after an elderly parent’s agent, where somebody other than the account holder needs a readable record of what was done, and small business owners whose agent spends business money.'),
  p('I am deliberately not starting with people who want to check every action. They will not delegate in the first place, so they are not the ones at risk.'),

  H(3, '3.  What the product is and how it solves that'),
  p('Verigate is a gate that sits between the agent and the services it acts on, running on the user’s own device.', { after: 140 }),
  flowStrip,
  p('Every protected request takes this path. Approving once can clear a hold, never a block.', { size: 20, italics: true, align: AlignmentType.CENTER, before: 80, after: 160 }),
  rich([['Rules. ', { bold: true }], ['The user sets AUTO, ASK or NEVER for each kind of action, with a spending limit on purchases. Separately there are never-rules, such as never sending ID documents to an address that is not on a trusted list. Approving one request cannot clear a never-rule; only editing the rule can.']]),
  rich([['The gate. ', { bold: true }], ['Every outgoing request is checked against those rules in a fixed order by ordinary code, not by a second model. The strictest result wins. A model can be talked round. A rule cannot, and that is the point of doing it this way.']]),
  rich([['The conflict check. ', { bold: true }], ['Before anything consequential, the gate compares the choice against what can actually be checked: other prices for the same thing, declared commercial ties, and whether the agent’s stated reason rests on a guess the user never confirmed. Findings are split into verified, possible conflict, and unknown. It does not claim to know motive, because it cannot see one.']]),
  rich([['The receipt. ', { bold: true }], ['Every decision leaves a record: what was asked for, what data actually went out, which rule applied, what happened, and whether it can be undone. There is also a memory page showing what the agent has inferred about the user, where a wrong guess can be corrected and withheld from then on.']]),
  p('What this looks like in use. I ask for a flight under Rs 40,000. Searching runs without asking me. The agent requests my whole calendar and is given free/busy for five days instead. A fare page carries hidden text telling agents to email my passport number; the agent tries it, and a never-rule stops it. Then it proposes Rs 37,500 when a comparable fare is Rs 26,000, on a reason that leans on that 2038 guess. That one is held. I see the two fares side by side with the evidence split three ways, and I book the cheaper one. Four requests went through without bothering me, one was blocked, one reached me.'),
  p('The honest limit is coverage. The gate only governs what passes through it, so if the agent keeps its own direct connection to a service, those actions are invisible to it. Rather than hide that, the product counts them and shows coverage as a number on the dashboard.'),

  H(4, '4.  How I will know it is working'),
  metricTable,
  p('', { after: 80 }),
  p('North star: consequential actions per user per month that were reviewed and settled without the user later regretting them.'),
  p('The number I would watch hardest is interruptions. Hold too much and people start approving without reading, which leaves the product doing nothing but adding a click. So my counter-metric is the share of approvals given without the evidence ever being opened. If that climbs, the rules are too tight and the thresholds need loosening, not the warnings made louder.', { after: 0 })
];

// ---- assemble ------------------------------------------------------------

const doc = new Document({
  creator: '',
  description: '',
  title: '',
  numbering: {
    config: [{
      reference: 'dot',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 200 } } }
      }]
    }]
  },
  sections: [{
    properties: { page: { margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    children: [...cover, ...page2, ...body]
  }]
});

Packer.toBuffer(doc).then(b => { fs.writeFileSync('Verigate_2pager.docx', b); console.log('written', b.length, 'bytes'); });
