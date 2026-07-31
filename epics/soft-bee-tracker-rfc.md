# Soft-Bee Tracker Implementation Plan

## Project Goals

1. **Time Tracking**: Allow Soft-Bee developers to track their working hours on specific projects per month.
2. **Affiliate Program**: Provide clients with unique referral links. When a new client joins via a link, the referrer receives a dynamically configurable commission (e.g., 5-10%) of the total amount billed to the new client for developer hours.
3. **Invoicing**: Automatically generate PDF invoices taking into account developers' tracked hours and affiliate commission deductions.
4. **Admin Portal**: Allow admins to manage developers, clients, project assignments (including billing/pay rates), tracked hours, and the affiliate program.

---

## Technical Strategy

- **Affiliate Commission**: The commission percentage is dynamically configurable by an Admin. The deduction is currently calculated based on the *total amount billed to the client* for developer hours (future support may include calculating this from the company's profit margin). The calculations will be done solely using our own data tracked inside this service, without relying on external time-tracking APIs.
- **Billing Rates**: Developer rates differ per project. What is billed to the client is different from what the developer earns. 
- **Time Tracking**: Developers will input the total hours worked in a specific month. The system is designed so that live time tracking (with start/end timestamps) can be added in a future release.

---


## Proposed Database Schema (Supabase PostgreSQL)

We will leverage Supabase with Row Level Security (RLS) to enforce access control (Admins vs. Developers vs. Clients).

1. **`profiles`** (Extends Supabase Auth users)
   - `id` (uuid, references `auth.users`)
   - `role` (enum: `admin`, `developer`, `client`)
   - `full_name` (text)

2. **`projects`**
   - `id` (uuid)
   - `client_id` (uuid, references `profiles`)
   - `name` (text)
   - `status` (enum: `active`, `archived`)

3. **`project_developers`** *(Mapping developers to projects with specific rates)*
   - `id` (uuid)
   - `project_id` (uuid, references `projects`)
   - `developer_id` (uuid, references `profiles`)
   - `billing_rate` (numeric) - *The hourly rate charged to the client.*
   - `pay_rate` (numeric) - *The hourly rate paid to the developer.*

4. **`time_entries`**
   - `id` (uuid)
   - `developer_id` (uuid, references `profiles`)
   - `project_id` (uuid, references `projects`)
   - `month_year` (date) - *e.g., 2026-07-01 representing July 2026.*
   - `hours` (numeric)
   - `description` (text)
   - `status` (enum: `unbilled`, `billed`)

5. **`affiliates`**
   - `id` (uuid)
   - `client_id` (uuid, references `profiles`)
   - `referral_code` (text, unique)

6. **`referrals`**
   - `id` (uuid)
   - `referrer_client_id` (uuid, references `profiles`)
   - `referred_client_id` (uuid, references `profiles`)
   - `commission_rate` (numeric) - *Dynamically set by admin (e.g., 0.05 for 5%).*
   - `created_at` (timestamp)

7. **`invoices`**
   - `id` (uuid)
   - `client_id` (uuid)
   - `billing_period_start` (date)
   - `billing_period_end` (date)
   - `total_billed_amount` (numeric)
   - `commission_deduction` (numeric) - *Calculated as `commission_rate * total_billed_amount`.*
   - `status` (enum: `draft`, `sent`, `paid`)
   - `pdf_url` (text - stored in Supabase Storage)
