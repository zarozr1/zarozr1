# Follow-Up Tracker

A single-page tool for following up on cheques, purchasing and daily work, with a management dashboard.

Open `index.html` in any browser. No install or server needed.

## Tabs
- **Management**: totals (cheques to pay and collect, bounced cheques, open purchases, late deliveries, open and overdue tasks) and one follow-up list of everything overdue or due within 7 days. Status can be changed straight from the list.
- **Cheques**: cheques marked Need to pay or To collect, with number, party, bank, amount, due date and status (Pending, Ready to collect, Deposited, Cleared, Bounced, Cancelled). The dashboard shows totals for need to pay, to collect and ready to collect.
- **Purchasing**: requests through to payment (Requested, Approved, Ordered, Delivered, Paid, Cancelled) with expected delivery dates.
- **Daily Work**: tasks with owner, priority, category, date and status.

Each list has search, status filter, sortable columns, overdue and due-soon highlighting, CSV export and CSV import.

## Importing
Use **Import CSV** on any list. The file needs a heading row. Export a list first to get the exact headings. Required values are marked with * in the form. Rows missing one are skipped, and you see a count before anything is added. Existing records are never changed. Dates must be year-month-day, for example 2026-10-20.

## Data
Data is stored in your browser (localStorage) on this device. Use **Export** and **Import** in the header to back up or move it. Set your currency in the header.

## Shared online version
`shared-tracker.html` is the same tracker for a team. It is published as a claude.ai page whose records live in a shared database, so everyone with access sees changes live. Share the page from its Share menu: Contributors can add and edit records, Viewers can only read.
