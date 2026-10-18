# Brag Document

**Name:** Hnabil (hnabil@iristechnology.me)
**Period:** October 2026 (update as you go)
**Last updated:** 2026-10-18

> Keep this living. Add an entry the week something happens, while the details are fresh. Fill in the `TODO` lines with numbers only you know.

---

## Highlights

- Built a **follow-up tracker** from scratch in about 3 days (Oct 11–13, 2026). It replaces scattered spreadsheets for cheques, purchasing and daily work with one tool and a management dashboard.
- Shipped **two versions**: a standalone, no-install page that works offline, and a shared online version where a whole team sees changes live.
- Built a **smart import tool** that reads Excel, CSV, TSV and JSON files in any layout and matches the columns automatically. It understands English and Arabic headings. Nobody has to retype existing data.

---

## Projects & Impact

### Follow-Up Tracker (Oct 2026)
**What:** A single-page tool to follow up on cheques, purchasing requests and daily work, with a management dashboard.

**What I delivered**
- **Management dashboard** with totals for cheques to pay and to collect, bounced cheques, open purchases, late deliveries, and open and overdue tasks. It has one follow-up list of everything overdue or due in the next 7 days. Managers can change a status straight from that list.
- **Cheque tracking** with *Need to pay* and *To collect* types and a full status flow: Pending, Ready to collect, Deposited, Cleared, Bounced, Cancelled.
- **Purchasing tracking** from request to payment, with expected delivery dates and late-delivery flags.
- **Daily work** tasks with owner, priority, category, date and status.
- **Usability on every list:** search, status filters, sortable columns, overdue and due-soon highlighting, and CSV export.
- **Backup and restore** of all data, plus a currency setting.

**Why it matters**
- Gives management one place to see what needs attention instead of chasing several files.
- Surfaces bounced cheques, late deliveries and overdue tasks before they become problems.
- Needs no install, server or licence. It opens in any browser.

### Shared Online Version (Oct 11, 2026)
- Took the tracker from a single-user tool to a **team tool**. It is published as a page backed by a shared database, so everyone sees changes live.
- Set up permission levels: Contributors can add and edit, Viewers can only read.

### Excel / CSV / JSON Importer (Oct 13, 2026)
- Wrote a **~400-line importer** (`tools/importer.js`) that handles `.xlsx`, `.xlsm`, `.csv`, `.tsv`, Excel "Unicode text" and `.json`.
- **Zero-setup column matching:** picks the sheet and heading row, guesses each column, supports **English and Arabic headings**, and lets the user correct any match before anything is added.
- **Handles messy real-world data:** real Excel dates, day/month/year and month/day/year text dates, amounts with commas or currency text, and Arabic digits.
- **Safe by design:** skips rows missing required values, can skip duplicates, and never changes existing records.
- Added a small build step (`tools/build.py`) so one importer source stays in sync across both versions of the tracker.

---

## By the Numbers

| Metric | Value |
|---|---|
| Time from first commit to full import support | 3 days (Oct 11–13, 2026) |
| Versions shipped | 2 (standalone and shared) |
| Lists / modules | 3 (Cheques, Purchasing, Daily Work) plus a Management dashboard |
| Import formats supported | 6 (xlsx, xlsm, csv, tsv, Unicode text, json) |
| Languages handled in import | English and Arabic |
| Code written | ~1,950 lines across the two pages and the importer |
| Time saved per week | TODO: e.g. "~X hrs of manual chasing" |
| Records tracked | TODO: e.g. "N cheques worth X" |
| Late payments or bounced cheques caught early | TODO |

---

## Skills Demonstrated

- **Product thinking:** started from a real operational pain (cheques, purchasing, daily follow-up) and reshaped the design after real use, for example reworking cheque types to *Need to pay / To collect*.
- **End-to-end delivery:** design, build, documentation, backup and a team-sharing model.
- **Data wrangling:** a forgiving importer for messy, bilingual, multi-format data.
- **Practical engineering:** no dependencies for users, a single-file deploy, and a build script that avoids duplicated code.
- **Documentation:** a clear README covering tabs, importing, data storage and sharing.

---

## Collaboration & Leadership

- TODO: Who uses the tracker? Which teams or managers adopted it?
- TODO: Feedback or quotes from colleagues or management.
- TODO: Training, handover or demos you ran.

---

## Learning & Growth

- Picked up spreadsheet-format parsing (OOXML) and locale-aware date and number handling.
- Practised designing for non-technical users: matching columns for them instead of asking them to reformat files.

---

## Recognition

- TODO: Thanks, shout-outs, awards or positive messages. Paste the exact wording and date.

---

## Goals for Next Period

- TODO: e.g. roll the shared tracker out to more teams.
- TODO: e.g. add reminders or notifications for due-soon items.
- TODO: e.g. add reporting by supplier or bank.

---

## Weekly Log (append here)

| Date | What I did | Impact |
|---|---|---|
| 2026-10-11 | Built the first follow-up tracker, then the shared online version. Added CSV import and reworked cheque types. | Single place to track cheques, purchasing and tasks, usable by a team |
| 2026-10-13 | Added the Excel, CSV, TSV and JSON importer with automatic column matching. | Existing data can be loaded without retyping |
| | | |
