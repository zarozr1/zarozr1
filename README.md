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
Use **Import Excel / CSV** on any list. It reads:
- Excel workbooks (.xlsx, .xlsm). Older .xls files must be saved as .xlsx first.
- CSV, tab-separated and Excel "Unicode text" files (.csv, .tsv, .txt).
- JSON lists of records (.json).

You do not need to match the tracker's layout. The import window picks the sheet and the heading row, guesses which column is which (English and Arabic headings), and lets you correct any match before anything is added. Real Excel dates, day/month/year or month/day/year text dates, amounts with commas or currency text, and Arabic digits are all understood. Rows missing a required value are skipped, rows already in the list can be skipped, and existing records are never changed.

The importer lives in `tools/importer.js` and is copied into both pages by `python3 tools/build.py`. Edit the source, then run the build.

## Data
Data is stored in your browser (localStorage) on this device. Use **Save backup** and **Restore backup** in the header to back up or move it. Set your currency in the header.

## Shared online version
`shared-tracker.html` is the same tracker for a team. It is published as a claude.ai page whose records live in a shared database, so everyone with access sees changes live. Share the page from its Share menu: Contributors can add and edit records, Viewers can only read.
