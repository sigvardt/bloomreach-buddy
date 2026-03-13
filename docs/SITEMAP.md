# Bloomreach Engagement Dashboard — Complete Sitemap

> **Project:** Kingdom of Joakim (Sandbox)
> **Organization:** POWER
> **Base URL:** `https://power.bloomreach.co/p/kingdom-of-joakim`
> **Login URL:** `https://app.exponea.com` (redirects to `https://eu.login.bloomreach.com/login`)
> **Account page:** `https://eu.login.bloomreach.com/my-account`
> **Generated:** 2026-03-12

---

## UI Layout

```
+----------------------------------------------------------------------+
| LEFT SIDEBAR (navigation)  |  TOP BAR (breadcrumbs + actions)        |
|                            |                                          |
| - Overview                 |  MAIN WORKSPACE                         |
| - Campaigns                |  (content area for selected section)    |
| - Analyses                 |                                          |
| - Data & Assets            |                                          |
| - Initiatives              |                                          |
| - Use Case Center          |                                          |
| - [Settings gear icon]     |                                          |
+----------------------------------------------------------------------+
| SECONDARY SIDEBAR (left)   |                                          |
| Section-specific sub-nav   |                                          |
+----------------------------------------------------------------------+
```

---

## 1. Overview

**Sidebar path:** Overview
**URL:** `/dashboards`

### Sub-sections (secondary sidebar)

| Item                          | URL                                        | Description                                  |
| ----------------------------- | ------------------------------------------ | -------------------------------------------- |
| **My dashboards**             | `/dashboards`                              | Custom dashboards list; create new dashboard |
| **Project performance** `new` | `/overview/performance-dashboards/project` | Built-in project KPI dashboard               |
| **Channel performance** `new` | `/overview/performance-dashboards/channel` | Email/channel performance metrics            |
| **Bloomreach usage**          | `/overview/pricing-dashboard-v2`           | Billing and event usage dashboard            |
| **Project overview**          | `/overview/project`                        | High-level project statistics                |
| **Project health** `beta`     | `/overview/health-dashboard`               | Health metrics for the project               |
| **Privacy tutorial**          | `/overview/privacy-tutorial`               | Interactive privacy/consent tutorial         |

### Actions

- Create new dashboard
- Set home dashboard
- View project performance
- View channel performance
- View Bloomreach usage/billing

---

## 2. Campaigns

**Sidebar path:** Campaigns
**URL:** `/campaigns/campaign-designs`

### Sub-sections (secondary sidebar)

| Item                | URL                           | Description                                     |
| ------------------- | ----------------------------- | ----------------------------------------------- |
| **Calendar**        | `/campaigns/calendar`         | Visual campaign timeline                        |
| **Scenarios**       | `/campaigns/campaign-designs` | Multi-step automation flows (main orchestrator) |
| **Email campaigns** | `/campaigns/email-campaigns`  | One-off or recurring email sends                |
| **Surveys**         | `/campaigns/surveys`          | On-site survey widgets                          |
| **Weblayers**       | `/campaigns/banners`          | On-site overlays/banners/popups                 |
| **Recommendations** | `/campaigns/recommendations`  | Product recommendation engine                   |

### Content tabs (within Scenarios page)

- Scenarios
- Email campaigns
- Surveys
- Weblayers (via "More" menu)
- Recommendations (via "More" menu)

### Actions

- Create new scenario
- Create email campaign
- Create survey
- Create weblayer
- Create recommendation model
- View campaign calendar
- Filter campaigns (by status: Active/Inactive/Finishing/Draft)
- Filter by tags
- Toggle Live/Archived view
- Show only mine
- Include/exclude initiatives

---

## 3. Analyses

**Sidebar path:** Analyses
**URL:** `/analytics`

### Sub-sections (secondary sidebar)

| Item                   | URL                        | Description                          |
| ---------------------- | -------------------------- | ------------------------------------ |
| **Home**               | `/analytics`               | Analysis listing with filters        |
| **Trends**             | `/analytics/trends`        | Time-series event charts             |
| **Funnels**            | `/analytics/funnels`       | Conversion funnel analysis           |
| **Reports**            | `/analytics/reports`       | Tabular event/customer reports       |
| **Retentions**         | `/analytics/retentions`    | Cohort retention analysis            |
| **Segmentations**      | `/analytics/segmentations` | Customer segment builder (real-time) |
| **Flows**              | `/analytics/flows`         | Sankey-style customer journey flows  |
| **Geo analyses**       | `/analytics/geoanalyses`   | Geographic breakdowns                |
| **SQL Reports** `beta` | `/analytics/sqlreports`    | Raw SQL against your data            |

### Content tabs (within Analyses page)

- All
- Trends
- Funnels
- Reports
- Retentions (via "More" menu)
- Segmentations (via "More" menu)
- Flows (via "More" menu)
- Geo analyses (via "More" menu)
- SQL reports (via "More" menu)

### Actions

- Create new analysis (any type)
- Create trend analysis
- Create funnel analysis
- Create report
- Create retention analysis
- Create segmentation
- Create flow analysis
- Create geo analysis
- Create SQL report
- Filter analyses (Live/Archived, tags, initiatives)

---

## 4. Data & Assets

**Sidebar path:** Data & Assets
**URL:** `/crm/customers`

### Sub-sections (secondary sidebar)

| Item              | URL                  | Description                                                   |
| ----------------- | -------------------- | ------------------------------------------------------------- |
| **Customers**     | `/crm/customers`     | Customer database browser — search, view profiles, attributes |
| **Catalogs**      | `/crm/catalogs`      | Product/item catalogs                                         |
| **Vouchers**      | `/crm/vouchers`      | Discount code pools                                           |
| **Asset manager** | `/data/assets`       | Templates, files, snippets                                    |
| **Tag manager**   | `/data/managed-tags` | JavaScript tag injection                                      |
| **Data manager**  | `/data/management`   | Event/attribute schema management                             |
| **Metrics**       | `/data/metrics`      | Custom computed metrics                                       |
| **Imports**       | `/data/imports`      | CSV/API data imports                                          |
| **Exports**       | `/data/exports`      | Scheduled data exports                                        |
| **Integrations**  | `/data/integrations` | Third-party connectors                                        |

### Asset Manager — sub-tabs

| Tab             | URL                               | Description                                     |
| --------------- | --------------------------------- | ----------------------------------------------- |
| **Emails**      | `/data/assets/email-templates`    | Email templates (Visual builder + HTML builder) |
| **Weblayers**   | `/data/assets/weblayer-templates` | Weblayer templates                              |
| **Blocks**      | `/data/assets/blocks`             | Reusable content blocks                         |
| **Custom rows** | `/data/assets/custom-rows`        | Custom email row components                     |
| **Snippets**    | (via "More")                      | Reusable Jinja/HTML code blocks                 |
| **Files**       | (via "More")                      | Images, files management                        |

### Data Manager — sub-tabs

| Tab                     | URL                                    | Description                |
| ----------------------- | -------------------------------------- | -------------------------- |
| **Customer properties** | `/data/management/customer-properties` | Customer attribute schema  |
| **Events**              | `/data/management/events`              | Event definitions          |
| **Definitions**         | `/data/management/definitions`         | Field definitions          |
| **Mapping**             | `/data/management/mapping`             | Data mapping configuration |
| **Content sources**     | `/data/management/content-sources`     | External data feeds        |

### Actions

- Create new customer
- Search/filter customers
- View customer profile
- Create/manage catalogs
- Create/manage voucher pools
- Create email template (Visual builder or HTML builder)
- Create weblayer template
- Create content block
- Create custom row
- Create/manage snippets
- Upload/manage files
- Create/manage tags
- Add/edit customer properties
- Add/edit event definitions
- Configure data mapping
- Add content sources
- Create/manage metrics
- Import data (CSV/API)
- Create/manage data exports
- Configure integrations
- Save data manager changes

---

## 5. Initiatives

**Sidebar path:** Initiatives
**URL:** `/initiatives`

### Description

Folder/project management system for organizing campaigns, analyses, and assets into logical groups.

### Actions

- Create new initiative
- Import initiative
- Filter initiatives (Live/Archived, date created, tags)
- Show only mine

---

## 6. Use Case Center

**Sidebar path:** Use Case Center
**URL:** `/use-case-center/use-case-center`

### Sub-tabs

| Tab                   | URL                      | Description                     |
| --------------------- | ------------------------ | ------------------------------- |
| **Home**              | `?tab=home`              | Browse by goal category         |
| **All use cases**     | `?tab=all-use-cases`     | Full library with filters       |
| **Project use cases** | `?tab=project-use-cases` | What's deployed in your project |

### Goal categories (on Home tab)

- **AWARENESS** — Drive more traffic
- **ACQUISITION** — Grow your database
- **ACQUISITION** — Acquire customers
- **RETENTION** — Increase customer retention
- **RETENTION** — Reactivate customers
- **RETENTION** — Reengage subscribers
- **OPTIMIZATION** — Reduce returns
- **OPTIMIZATION** — Analyze data

### Actions

- Search use cases
- Browse by category (New, Essentials, Popular, My favorites)
- Deploy use case to project
- Favorite/unfavorite use case

---

## 7. Project Settings

**URL:** `/project-settings/general`
**Access:** Settings gear icon (bottom of left sidebar)

### Project

| Setting                      | URL                                           | Description                         |
| ---------------------------- | --------------------------------------------- | ----------------------------------- |
| **General project settings** | `/project-settings/general`                   | Project name, type, token, calendar |
| **Terms & Conditions**       | `/project-settings/terms-and-conditions`      | T&C configuration                   |
| **Custom Tags**              | `/project-settings/custom-tags`               | Tag management for organizing items |
| **Project variables**        | `/project-settings/project-variables-project` | Global template variables           |

### Access Management

| Setting          | URL                                 | Description               |
| ---------------- | ----------------------------------- | ------------------------- |
| **Project team** | `/project-settings/project-team-v2` | User management and roles |
| **API**          | `/project-settings/api`             | API keys and credentials  |

### Security

| Setting                   | URL                                  | Description              |
| ------------------------- | ------------------------------------ | ------------------------ |
| **SSH tunnels**           | `/project-settings/ssh-tunnels`      | SSH tunnel configuration |
| **Two-step verification** | `/project-settings/project-two-step` | 2FA settings             |

### Performance Dashboards

| Setting                 | URL                                             | Description                     |
| ----------------------- | ----------------------------------------------- | ------------------------------- |
| **Revenue attribution** | `/project-settings/project-revenue-attribution` | Attribution model configuration |
| **Currency**            | `/project-settings/currency`                    | Currency settings               |

### Campaigns — General

| Setting                       | URL                                   | Description                    |
| ----------------------------- | ------------------------------------- | ------------------------------ |
| **General campaign settings** | `/project-settings/campaigns`         | Default campaign configuration |
| **Time zones**                | `/project-settings/timezones`         | Time zone settings             |
| **Languages**                 | `/project-settings/languages`         | Language configuration         |
| **Fonts**                     | `/project-settings/fonts`             | Custom font management         |
| **Throughput policies**       | `/project-settings/throughput-policy` | Send rate limits               |
| **Global URL lists**          | `/project-settings/global-url-lists`  | URL list management            |
| **Page variables**            | `/project-settings/page-variables`    | Page-level variables           |

### Campaigns — Privacy Management

| Setting              | URL                                             | Description                  |
| -------------------- | ----------------------------------------------- | ---------------------------- |
| **Frequency policy** | `/project-settings/campaign-frequency-policies` | Global send frequency limits |
| **Consents**         | `/project-settings/consents`                    | Consent management           |

### Campaigns — Channels

| Setting                | URL                                    | Description                        |
| ---------------------- | -------------------------------------- | ---------------------------------- |
| **Emails**             | `/project-settings/emails`             | Email sender domains and config    |
| **Push notifications** | `/project-settings/push-notifications` | Mobile push config (Firebase/APNs) |
| **SMS**                | `/project-settings/sms`                | SMS provider configuration         |
| **Mobile messaging**   | `/project-settings/mobile-messaging`   | WhatsApp, RCS config               |
| **Payment tracking**   | `/project-settings/payment-tracking`   | Payment tracking integration       |
| **Facebook messaging** | `/project-settings/facebook-messaging` | Facebook Messenger config          |

### Campaigns — Mapping

| Setting      | URL                          | Description                   |
| ------------ | ---------------------------- | ----------------------------- |
| **Vouchers** | `/project-settings/vouchers` | Voucher mapping configuration |

### Campaigns — Evaluation

| Setting                   | URL                                       | Description                          |
| ------------------------- | ----------------------------------------- | ------------------------------------ |
| **Evaluation dashboards** | `/project-settings/evaluation-dashboards` | Campaign evaluation dashboard config |

### Actions

- Edit project name and settings
- Manage project team members
- Generate/manage API keys
- Configure SSH tunnels
- Enable/disable two-step verification
- Configure revenue attribution
- Set currencies
- Configure campaign settings per channel
- Manage frequency policies
- Manage consents
- Configure email domains
- Configure push notification providers
- Configure SMS providers
- Configure mobile messaging channels
- Save settings changes

---

## Screenshots

| Screenshot                   | Section                      |
| ---------------------------- | ---------------------------- |
| `01-home.png`                | Home / landing page          |
| `02-overview-dashboards.png` | Overview > My Dashboards     |
| `03-campaigns-scenarios.png` | Campaigns > Scenarios        |
| `04-analyses.png`            | Analyses listing             |
| `05-data-assets.png`         | Data & Assets > Customers    |
| `06-data-manager.png`        | Data & Assets > Data Manager |
| `07-initiatives.png`         | Initiatives                  |
| `08-use-case-center.png`     | Use Case Center              |
| `09-settings.png`            | Project Settings             |
