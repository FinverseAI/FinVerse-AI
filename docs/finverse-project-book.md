# Table of contents

**FINVERSE AI | THE PROJECT BOOK**

A short guide to the technology and the Personal Finance Dashboard.

| In this edition | Page |
| --- | --- |
| Technology stack - what we use and why | 3 |
| Chapter 1 - Personal Finance Dashboard | 4 |
| 1.1 Why this module exists | 4 |
| 1.2 How the user manages money | 5 |
| 1.3 How the system handles an expense | 6 |
| 1.4 Data, calculations and current limits | 7 |

## About this book

FinVerse AI is a B.Tech major project that brings personal money management and planned investment intelligence into one platform. This edition covers only Module 1: the Personal Finance Dashboard. Later modules can be added as new chapters.

The chapter follows three questions: **Why is this needed? What problem does it solve? How does the project solve it?** You do not need a coding background to read it.

## How to read the status of a feature

**Built** means the relevant implementation exists in the current files. **Partial** means a useful part exists but some work remains. **Planned** means the capability is an intention, not something the current application does.

> The dashboard currently organizes information entered by the user. It does not automatically read bank accounts, make payments or provide an AI financial adviser.

**Edition 2.1 | Content reviewed 18 November 2026**

This revision replaces the longer guide with a chapter-based book. It reflects newer source changes, including saved budget edits and recorded monthly cash flow. The review checked code and configuration; it did not repeat a live login, cloud-database or deployment test.

---

# Technology stack

A technology stack is the set of tools used to build and run an application. The reasons below explain how each tool helps this project; they are not a claim that the team documented a comparison with every alternative.

| Tool | What it does and why it is used |
| --- | --- |
| Next.js + React | Build the pages and interactive forms. Reusable screen components keep the dashboard consistent; Next.js also handles web requests on the server. |
| TypeScript | Checks the expected shape of data while developing, helping catch mistakes before users encounter them. |
| Tailwind CSS + shared CSS | Style the interface and adapt it to different screen sizes. Shared styles keep forms and cards visually consistent. |
| Node.js | Runs the JavaScript-based web and backend services outside the browser. |
| NestJS + Express | Organize the backend, the service that checks requests and applies rules. Separate finance services keep those rules manageable. |
| Better Auth + Google sign-in | Establish who is signed in and maintain their session, the temporary state that keeps them logged in. This lets records belong to the right person. |
| PostgreSQL + Neon | PostgreSQL stores linked records such as users, bills and expenses. Both apps are configured for Neon, a cloud host for PostgreSQL; live connectivity was not tested here. |
| Prisma | Connect application code to database tables. Its schema describes the records, and migrations record changes to that structure. |
| npm + Turborepo | Install packages and coordinate commands across the related apps kept in one repository. This simplifies shared development. |
| Docker Compose | Defines local PostgreSQL and Redis services for development. The current app configuration points to Neon; local database setup remains available. |
| Git + GitHub Actions | Git records source changes. The configured Actions workflow runs checks on code changes, helping the team catch problems early. |
| ESLint, Oxlint + Prettier | Check code quality and keep formatting consistent, making shared code easier to maintain. |
| Jest, Supertest + Node tests | Check backend behavior, request handling and frontend calculations so changes can be checked systematically. |

**Supporting tools:** NestJS Config loads service settings; Webpack and PostCSS prepare scripts and styles; React DOM draws React components in the browser. Fonts, type definitions and other support packages are listed in the project manifests.

**Configured or planned, not active features:** Redis is defined but not used by the app. Python/AI services, FastAPI, BullMQ and a vector store are not implemented in this module. A vector store finds reference text by similarity of meaning. Future AI tool choices are outside this chapter.

---

# Chapter 1

## Personal Finance Dashboard

### 1.1 Why this module exists

A bank balance answers only one question: how much money is in an account now? It does not explain how much is already needed for rent, which spending category is growing, or whether a savings goal has a clear target. When bills, notes and payments are scattered, building that picture takes effort.

Module 1 gives a person one workspace for their monthly plan and the activity they record. It is useful for someone managing an allowance, salary or other income who wants a clearer view of everyday money. Think of it as a financial notebook that can organize entries and calculate summaries.

## The problem and the response

| Everyday problem | How Module 1 responds |
| --- | --- |
| "I do not know where my money went." | Categorized expense records and spending charts show how entered spending is distributed. |
| "I spend before deciding what to set aside." | A monthly budget allocates income across categories, including an amount treated as the savings target. |
| "I forget upcoming bills." | A dated bill list shows upcoming and overdue items. It does not pay them automatically. |
| "My savings plans are vague." | Goals give a purchase or purpose a target amount, deadline and priority. Contributions are not tracked yet. |
| "A long list of payments is hard to understand." | Monthly cash-flow totals and weekly or monthly comparisons turn records into a readable overview. |

## The central idea: keep the plan and the record clear

The **plan** describes what the person expects to earn, spend and save. The **record** describes income and expenses actually entered in the app. Keeping these distinct helps the user see whether their recorded activity fits their intentions.

For example, a food budget of INR 3,000 is a plan. A food expense of INR 500 is a record. FinVerse can show that INR 500 has been recorded against that budget without pretending it knows every purchase made outside the app.

> The module's value is visibility: turn scattered entries into a clear plan, a readable spending history and a list of commitments.

---

# Chapter 1 / Using the dashboard

### 1.2 How the user manages money

## Start with a personal plan

The user signs in with Google. A new user completes four setup steps: name, monthly income and payday, budget percentages, and savings goals. This gives the dashboard enough information to show a personal plan instead of generic sample numbers. Returning users with completed setup can open their dashboard.

Budget percentages must add up to 100%. If monthly income is INR 30,000 and food receives 10%, its budget becomes INR 3,000. The app calculates category amounts in whole paise so rounding does not lose part of the allocated money.

In the current setup, Rent and Bills & Utilities form fixed expenses, Investments is treated as the monthly savings target, and the remaining allocation forms variable expenses. The Investments label does not purchase investments. Setup also supplies defaults for some profile fields; the fuller profile editor lets the user revise their information.

## Record income and expenses

The Add transaction form takes a description, amount, category and date. Income is stored as a positive amount and spending as a negative amount. Categories such as Food & Dining, Groceries, Health and Transport-related labels make later grouping possible. The transaction list can be searched.

The system saves a record before adding it to the displayed list. If saving fails, it shows an error. This matters because an entry visible on screen should not falsely suggest that an unsuccessful save worked.

## Review, adjust and plan ahead

The dashboard shows recorded monthly income, expenses and net cash flow. Spending analysis groups expenses by category and date, with weekly, monthly and custom views. Month controls let the user inspect recorded activity for another month. These figures describe entered transactions, not a verified bank balance.

The budget editor saves revised percentages through the profile service and updates the associated planned amounts. Matching current-month expenses show spending against each category's limit. This helps the user adjust the plan as their needs change.

Bills store an amount, due date and informational auto-pay label; users can add or remove them and see due-date states. Savings goals store a name, target amount, deadline and priority and can be managed through the profile editor. Neither feature moves money.

> A simple routine: set a plan, record activity, review the patterns, then adjust the plan. The usefulness of the picture depends on how complete the entered records are.

---

# Chapter 1 / Behind the screen

### 1.3 How the system handles an expense

The **frontend** is the website the person sees. The **backend** checks requests and applies rules. A **database** keeps records after the page closes. An **API** is an agreed way for these parts to ask each other for information or actions.

:::diagram

Finance requests follow the left branch. Sign-in uses Better Auth inside Next.js and the same PostgreSQL database. NestJS asks Better Auth to verify the session before accepting protected requests. The diagram describes implemented code paths; it is not evidence of a tested live deployment.

## Follow INR 500 spent on food

**1. Enter.** The user opens Add transaction and enters Food purchase, Expense, INR 500, Food & Dining and a date. This is a form entry; typing a sentence into an AI chat is not supported yet.

**2. Send and check.** Next.js forwards the request to NestJS. The backend verifies the signed-in user and checks the description, category, date and amount. An expense is represented as -500.00. The user ID comes from the verified session, not a user-selected account field.

**3. Save.** Prisma writes the expense to PostgreSQL with its owner, category and date. A successful response returns to the website. A later visit loads the saved records again, provided the configured services and database are available.

**4. Explain the result.** The transaction appears in the list. Relevant spending totals, the month's recorded cash flow and the matching current-month food budget update. If this is the only expense in the selected period, spending is INR 500 and food accounts for 100% of it.

The saved monthly income and current-savings profile fields are not automatically rewritten by that expense. They belong to the plan, while the new expense belongs to the activity record.

---

# Chapter 1 / Data and boundaries

### 1.4 Data, calculations and current limits

## What is stored, and why?

PostgreSQL is a relational database: it keeps related information in linked tables, like organized spreadsheets connected by an account number. A user ID links a person to one financial profile and to their goals, transactions, bills and sign-in records. The backend filters personal records by the verified owner.

The profile holds income, planned expenses, savings, preferences and the budget split. Goals hold targets and dates; transactions hold signed amounts and categories; bills hold amounts and due dates. Money fields keep two decimal places. Profile and goal changes are saved as one grouped database operation, so they succeed together or are rolled back together.

Both applications are configured to use Neon-hosted PostgreSQL. They must use the same database and schema, meaning the same table structure. Redis is not on the current saving path, and no vector storage is needed by the implemented finance forms and calculations.

## Calculations first; AI remains planned

Recorded net cash flow is recorded income minus recorded expenses. For example, INR 30,000 received and INR 8,000 spent gives INR 22,000 net recorded flow; it is not the account's total balance. Category shares divide each category's expenses by total expenses.

The month-end estimate extends the current daily spending pace: INR 6,000 recorded by day 15 of a 30-day month suggests INR 12,000 if that pace continues. This is arithmetic, not an AI prediction. Missing records or an unusual purchase can make it less representative.

Current checks reject invalid dates and amounts, enforce budget percentages and restrict access by account. These improve input reliability; they do not prove that an entry is truthful. A language model, an AI system that interprets and generates text, is not connected. Text expense entry, voice entry, receipt reading and AI explanations remain planned.

## What remains unfinished?

The core includes saved profiles, budget edits, goals, transaction entry, bills and spending views. Transaction editing/deletion, bill editing and payment history, goal contribution tracking, automatic bank imports, delivered reminders and downloadable financial reports were not found in the reviewed implementation. The existing report is an on-screen summary. Live operation was not re-tested for this book.

**Source note:** Checked against the current README, root/web/backend package manifests, database schema, authentication guard, profile validation, activity handlers, budget editor, onboarding calculations and dashboard cash-flow code on 18 November 2026. Planned AI scope follows the earlier project guide and module blueprint.

**Next edition:** Update Chapter 1 when a feature changes; add Chapter 2 when the team is ready to explain the investment module. Keep each new section focused on the problem, the solution and a clear example.
