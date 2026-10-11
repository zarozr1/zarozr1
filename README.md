# Follow-Up Tracker

A single-page tool for following up on cheques, purchasing and daily work, with a management dashboard.

Open `index.html` in any browser. No install or server needed.

## Tabs
- **Management**: totals (cheques to pay and collect, bounced cheques, open purchases, late deliveries, open and overdue tasks) and one follow-up list of everything overdue or due within 7 days. Status can be changed straight from the list.
- **Cheques**: issued and received cheques with number, party, bank, amount, due date and status (Pending, Deposited, Cleared, Bounced, Cancelled).
- **Purchasing**: requests through to payment (Requested, Approved, Ordered, Delivered, Paid, Cancelled) with expected delivery dates.
- **Daily Work**: tasks with owner, priority, category, date and status.

Each list has search, status filter, sortable columns, overdue and due-soon highlighting, and CSV export.

## Data
Data is stored in your browser (localStorage) on this device. Use **Export** and **Import** in the header to back up or move it. Set your currency in the header.
