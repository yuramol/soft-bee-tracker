# EPIC 2: WORKSPACE LAYOUT & TRACKING ENGINE

## 📋 Task 2.1: Implement Global Navigation Header & Logout Pipeline (Middle)

### Description

Create the global responsive navigation header (`Header`) that acts as the primary layout wrapper for all authenticated application routes (`/tracker`, `/crew`, `/projects`, `/reports`). The header includes reactive page state indicators and a user profile dropdown menu that manages redirection to the profile page and triggers the asynchronous logout pipeline.

### Technical Specification

- **Component Location**: src/shared/components/layout/Header.tsx
- **UI Components**: shadcn/ui `dropdown-menu`, `button`, `avatar`
- **Navigation Engine**: Next.js native `Link` and `usePathname` for active route states
- **State Pipeline**: Call `useSignOut` mutation → `signOutSession` helper in `lib/api/auth/mutations.ts` → Supabase `auth.signOut()` → NextAuth session eviction → clear TanStack Query cache → redirect `/login`

### Sub-tasks for Developer

1. **Build Header Layout & Navigation Links**:
   - Create a flexbox row container pinned to the top of the viewport with styling matching the application theme (`bg-background`, `border-b`).
   - Implement navigation hyperlinks pointing to the four core routes:
     - **Tracker**: `/tracker` (Current entry page)
     - **Crew**: `/crew`
     - **Projects**: `/projects`
     - **Reports**: `/reports`
   - Use the `usePathname()` hook from `next/navigation`. If the current pathname matches the link route, apply high-contrast active styling (`text-foreground font-semibold`), otherwise render with muted styling (`text-muted-foreground`).

2. **Implement User Dropdown Menu**:
   - Place the profile icon container at the far right of the navigation header using shadcn/ui `DropdownMenu`.
   - **Item 1: Profile**: Triggers router redirection to the user configuration view (`/profile`).
   - **Item 2: Logout**: Styled with destructive accent tones, calls `useSignOut().mutate()`.

3. **Construct the TanStack Query Logout Pipeline** (`src/lib/api/auth/mutations.ts`):
   - Implement `signOutSession` pure helper and `useSignOut` mutation hook.
   - Inside the mutation helper, in order:
     - Execute `supabase.auth.signOut()`.
     - Call the NextAuth `signOut()` utility to evict session cookies.
     - `queryClient.clear()` or invalidate auth/session query keys.
   - In `onSuccess`: reset any Zustand auth UI store via `useAuthStore.getState().resetAuthUi()`, then `router.push('/login')`.
   - In `onError`: `toast.error` with the failure message.

---

### UI Component Structural Reference Blueprint

Developers should map the dropdown elements cleanly using the pre-installed shadcn modules:

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

The trigger must use user session metadata (such as rendering `session.user.first_name[0]` as a fallback avatar text string if an explicit `avatar_url` value is not provided by the profile object).

---

### Definition of Done (DoD)

- The navigation bar mounts correctly and scales responsively across shifting monitor dimensions.
- Clicking active tabs handles seamless navigation between core layout views without causing heavy document re-renders.
- The application applies clear indicator styles to the currently active route path dynamically.
- Clicking the logout button clears TanStack Query auth cache, resets Zustand auth UI state, destroys session cookies, calls the Supabase authentication cleanup method, and navigates to `/login`.

## 📋 Task 2.2: Implement Interactive Tracker Calendar & Legend Indicators (Middle)

### Description

Migrate the legacy Material-UI calendar picker into a responsive, high-performance tailwind component leveraging the shadcn/ui Calendar infrastructure (`react-day-picker`). The calendar highlights tracking status dynamically via reactive contextual badges: green for sufficient duration targets ($\ge 5$ hours), orange for weekends, and red for incomplete gaps or missing days. It triggers asynchronous Redux-Saga requests to fetch tracking limits whenever the user changes the active month view.

### Technical Specification

- **Component Location**: src/features/tracker/components/TrackerCalendar.tsx
- **Visual Stack**: shadcn/ui `Calendar`, TailwindCSS, `lucide-react`
- **Core Logic Rule**: Standard work shifts require a minimum threshold of 5 logged hours per day.
- **State Interceptors**: Triggers `fetchMonthlyTrackersAction` on layout bounds mutation.

### Sub-tasks for Developer

1. **Rebuild Calendar Structure using react-day-picker Modifiers**:
   - Mount the shadcn/ui `<Calendar />` component configuration into the internal tracker layout view.
   - Enforce boundary parameters: prevent selecting future offsets (`disabled={{ after: new Date() }}`) and clamp historical ranges to the start of the previous month.
   - Map database trackers state metrics arrays (`TrackerByDay[]`) inside the parent context scope to establish cell modifiers.

2. **Develop Custom Day Cell Modifiers & Status Decorators**:
   - Formulate styling conditions for calendar day rendering:
     - **Weekend Identifier**: Evaluates day sequence indexes ($0$ for Sunday, $6$ for Saturday). Applies an orange badge indicator marker.
     - **Sufficient Tracker Marker**: Matches current cell timestamp coordinates against database ledger arrays. If the user successfully logged $\ge 5$ hours, anchor a green dot decorator below the numeric label.
     - **Deficit / Incomplete Day Marker**: If a weekday is within the active selection bounds but holds $< 5$ total tracked hours or lacks a record entirely, anchor a red dot indicator.

3. **Wire Month Navigation to Redux-Saga Actions Pipeline**:
   - Implement the `onMonthChange` intercept hook callback wrapper.
   - Whenever a user clicks navigation controls to switch months, compute matching boundaries (`startOfMonth` and `endOfMonth`).
   - Dispatch `fetchMonthlyTrackersAction` containing the boundary dates payload (`YYYY-MM-DD`) to fetch real-time timesheet aggregates from Supabase via the Saga workflow.

4. **Reconstruct Aligned Legend Layout**:
   - Recreate the `LegendCalendar` widget directly below the calendar grid layout using pure Tailwind CSS utility lists and flex rows.
   - Render indicators to match cell logic: Red (`bg-red-500`) for missing tracker, Orange (`bg-orange-500`) for weekends, Green (`bg-green-500`) for tracked days.

---

### Definition of Done (DoD)

- The calendar framework operates accurately without any remaining references to `@mui/material`.
- Shifting active month views correctly dispatches the payload limits to update the local store data providers.
- Calendar cell elements render correct color codes instantly as tracking rows change.

## 📋 Task 2.3: Implement Realtime Projects Sync via Supabase Channels (Senior)

### Description

Enhance the projects infrastructure by establishing a persistent WebSocket subscription using Supabase Realtime Channels. Instead of relying purely on one-off REST fetches, the application will stream live mutations (`INSERT`, `UPDATE`, `DELETE`) directly from the `public.projects` table. This event loop utilizes Redux-Saga `eventChannel` pipelines to automatically synchronize the shared Redux store cache whenever administrative changes occur on the backend database.

> ⚠️ **CRITICAL DEVELOPER NOTE (INFRASTRUCTURE PRE-REQUISITE)**:
> For this real-time subscription to receive database events, replication updates must be enabled explicitly in the database layer. The developer **MUST** navigate to the Supabase Dashboard (`Dashboard -> Database -> Replication`), view the `supabase_realtime` publication, and **toggle the switch to ENABLE Realtime for the `projects` table**. Without this configuration, the database replication engine will not broadcast write-logs onto the active client WebSockets.

### Technical Specification

- **Data Stream Source**: Supabase Realtime Broadcast / Replication Engine (Requires explicit table replication toggle)
- **Target Table**: `public.projects`
- **Saga Middleware Tool**: `eventChannel` from `redux-saga`
- **Integration Lifecycle**: Subscription connects when the main workspace layout mounts and tears down seamlessly on unmount hooks.

### Sub-tasks for Developer

1. **Configure Supabase Realtime Channels Worker**:
   - Author a real-time event pipeline generator factory inside `projects.sagas.ts` using `eventChannel`.
   - Initialize a Supabase subscription targeting the `projects` table for the current user session context.
   - Listen to all broadcast operations (`*` or explicit `INSERT`, `UPDATE`, `DELETE` events).
   - Ensure that the channel's callback parameters format the incoming data payloads and push them straight into the saga's event queue listener.
   - Provide an explicit teardown callback function inside the channel declaration to cleanly call `.unsubscribe()` when the user logs out or leaves the workspace layout context.

2. **Develop the Event Loop Orchestrator Saga**:
   - Create a master orchestrator saga worker (`watchProjectsRealtimeSaga`).
   - Inside a continuous loop (`while (true)`), pull events from the project channel instance.
   - Map database transaction payloads to matching reactive slice actions:
     - **INSERT**: Add the new project row into the Redux cache (respecting active status flags).
     - **UPDATE**: Merge mutated attributes into the existing array node entry.
     - **DELETE**: Filter out and remove the dropped object GUID from the active array branch.

3. **Wire Lifecycle Triggers to layout**:
   - Create action triggers: `startProjectsSubscriptionAction` and `stopProjectsSubscriptionAction`.
   - Add active listeners inside the global layout file. Trigger initialization actions upon successful login validations, and pipe termination triggers to prevent system memory leaks.

---

### Redux-Saga Realtime Channel Implementation Blueprint

The developer must map external subscription payloads into the Saga ecosystem via the following event flow pattern:

```typescript
import { eventChannel } from "redux-saga";
import { take, put, call } from "redux-saga/effects";
import { supabase } from "@/shared/lib/supabaseClient";
import { projectActions } from "./projects.slice";

// Factory function to establish the native Supabase WebSocket stream wrapper
function createProjectsChannel() {
  return eventChannel((emitter) => {
    const channel = supabase
      .channel("live-projects-mutations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (payload) => {
          emitter(payload); // Push database payload straight into the Saga event loop
        },
      )
      .subscribe();

    // Clean up channel links when the saga consumer calls return/cancel routines
    return () => {
      supabase.removeChannel(channel);
    };
  });
}

export function* watchProjectsRealtimeSagaWorker() {
  const channel = yield call(createProjectsChannel);
  try {
    while (true) {
      const payload = yield take(channel);
      const { eventType, new: newRow, old: oldRow } = payload;

      if (eventType === "INSERT" && newRow.status === "active") {
        yield put(projectActions.addProject(newRow));
      } else if (eventType === "UPDATE") {
        yield put(projectActions.updateProject(newRow));
      } else if (eventType === "DELETE") {
        yield put(projectActions.deleteProject(oldRow.id));
      }
    }
  } finally {
    channel.close(); // Safeguard execution state loops
  }
}
```

---

### Definition of Done (DoD)

- Bootstrapping the main view layout initializes a stable real-time WebSocket pipe with Supabase.
- Creating or archiving projects inside the database backend pushes changes to the active client cache instantly without page refreshes (provided replication is active).
- The local Redux store array dynamically updates rows while preserving existing UI state inputs.
- Navigating away from the protected tracking workspace or invoking logout workflows completely terminates WebSocket connection listeners.

## 📋 Task 2.4: Implement Floating Tracker Entry Dialog & Mutation Pipeline (Middle)

### Description

Migrate the legacy Formik/MUI tracker entry form into a strict, type-safe validation interface wrapped inside an accessible dialog container (`TrackerEntryDialog`). To maximize accessibility and screen real estate, the primary trigger must be implemented as a Floating Action Button (FAB) locked to the bottom-right corner of the active viewport layout. This module supports operational context switches based on business flags (`isLive`, `withEmployee`), embeds native `shadcn/ui` date popovers, and manages asynchronous projects/employees store subscription pipelines. Submitting the form triggers a Redux-Saga workflow that commits transaction logs to Supabase.

### Technical Specification

- **Component Location**: `src/features/tracker/components/TrackerEntryDialog.tsx`
- **Form Engine**: `react-hook-form` + `@hookform/resolvers/zod`
- **UI Components**: `shadcn/ui` (`Dialog`, `DialogTrigger`, `DialogContent`, `Form`, `Popover`, `Calendar`, `Input`, `Select`, `Textarea`, `Button`)
- **Trigger Element Layout**: Tailwind utility classes for fixed floating positions (`fixed bottom-6 right-6 z-50 rounded-full shadow-xl`)
- **State Selectors**: Select dynamic arrays from `projectSelectors` and `crewSelectors`.

### Sub-tasks for Developer

1. **Implement Viewport-Fixed Floating Action Button Trigger**:
   - Mount a trigger component using `shadcn/ui` `<Dialog>`.
   - Style the `<DialogTrigger>` button as a floating circular or pill-shaped container using Tailwind utility classes: `fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-transform hover:scale-105`.
   - Embed a semantic graphic indicator icon inside the trigger node (e.g., `Plus` from `lucide-react`).

2. **Reconstruct Form Layout and Conditional Blocks**:
   - Replace legacy absolute MUI `modalStyle` wrappers with responsive Tailwind grid elements (`space-y-4`, `w-full`).
   - **Date & Duration Blocks**: Render these controls conditional on `!isLive`. Use a `shadcn/ui` `<Popover>` containing a single-day `<Calendar>` element for data pickers, alongside a numeric duration field. Clamp historical date selections based on the `getCanAddEditTracks()` validation rule (current or previous month limits).
   - **Dropdown Toggles**:
     - If `withEmployee === true`, render the **Employee Selection** dropdown populated by the crew store array.
     - If `withEmployee === false`, render the **Project Selection** dropdown populated by active project records assigned to the current user.
   - **Description Box**: Build a standard `shadcn/ui` `<Textarea>` element with `rows={4}` and enforce a maximum constraint layout of 1000 characters.

3. **Define Strict Zod Type Bindings**:
   - Build the form processing schema to enforce consistency over data mutations:
     - **Date**: Required timestamp string or Date object (validated only when `isLive` is false).
     - **Duration**: Must be an explicit numeric payload representing total minutes, strictly greater than 0.
     - **Project / User ID**: Valid non-empty GUID/UUID reference string depending on active layout flags.
     - **Description**: Enforce length parameters: minimum of 5 characters, maximum of 1000 characters.

4. **Develop Asynchronous Mutation Saga Workers**:
   - Catch the submission action within `tracker.sagas.ts`.
   - Map form values into database ledger formats and trigger write requests against the Supabase schema client.
   - **On Success**: Dispatch success modifiers, fire a success status report via `toast.success()`, close the dialog automatically by toggling the local visibility open state context to `false`, and refresh active calendar rows.
   - **On Failure**: Interrupt execution loaders and present backend errors via toast elements.

---

### UI Implementation Structural Blueprint

Developers should assemble the fixed floating button wrapper and dialog context cleanly using the semantic shadcn pattern:

````typescript
import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const TrackerEntryDialog = ({ isLive = false, withEmployee = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        {/* Floating Action Button (FAB) positioned relative to the screen layout */}
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl transition-transform hover:scale-105"
          aria-label="Log time entry"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isLive ? "Start Live Tracker" : "Log Manual Time"}</DialogTitle>
        </DialogHeader>

        {/* Render react-hook-form container inside Content layout */}

      </DialogContent>
    </Dialog>
  );
};

### Definition of Done (DoD)
- The trigger button is visually decoupled from standard document streams and floats consistently in the bottom-right viewport sector (fixed bottom-6 right-6 z-50).
- Clicking the floating button opens the modern, accessible dialog overlay smoothly.
- The form correctly hides date/duration fields if isLive is passed as true.
- The select component lists projects or employees depending on the withEmployee toggle configuration.
- Inline validations flag short descriptions ($< 5$ characters) or 0-duration entries immediately before network dispatch.
- Submitting valid form parameters triggers the Redux-Saga workflow, registers logs inside Supabase, fires success toasts, and automatically closes the dialog window.

## 📋 Task 2.5: Implement Vacation & Absences Management Widgets (Middle / Senior)

### Description

Migrate the legacy vacation tracking mechanics into modern, decoupled layout containers (`VacationWidget` and `VacationApproveModal`). In our consolidated architecture, vacations and sick leaves are not separate database entities—they are standard `public.trackers` ledger rows structurally linked via foreign keys to systemic, non-profit database `projects` titled 'vacation' or 'sickness'. The frontend must calculate taken days based on approved rows and offer context-aware operational buttons enabling managers to modify tracker statuses using standard Supabase mutations.

> ⚠️ **DEVELOPER NOTE ON RELATION DESIGN**:
> You do not need a separate `vacation` table. In this system, vacations and sick leaves are simply special projects in the `public.projects` table. When a user requests time off, they create a regular tracker entry pointing to the respective system project ID.

### Technical Specification

- **Target Components**:
  - `src/features/tracker/components/VacationWidget.tsx` (Sidebar balance viewer)
  - `src/features/tracker/components/VacationApproveModal.tsx` (Administrative approval grid)
- **UI Toolkit**: `shadcn/ui` (`Table`, `Dialog`, `Button`, `Progress`, `Badge`, `Card`)
- **Date Manipulation**: `date-fns` integration for processing calendar bounding ranges (`startOfYear` / `endOfYear`).

### Sub-tasks for Developer

1. **Build the Reactive Vacation Balance Widget Layout**:
   - Create a modular card element displaying the active user's attendance metrics.
   - Fetch historical logs for the current calendar year (`date` between Jan 1 and Dec 31). Filter query payloads strictly on projects where name descriptors match `'vacation'` or `'sickness'`.
   - **Compute Dynamic Values Aggregations**:
     - `vacationDays`: Count every item linked to the vacation project where `status === 'approved'`. Render against a hardcoded maximum constraint limit (e.g., `current / 25`).
     - `sicknessDays`: Count items linked to the sickness project. Render against its constraint boundary (`current / 5`).
   - Enforce relational rendering layouts: if `isCrewProfile` is verified and the profile UUID matches an external teammate, mask request components and render administrative tools based on permissions.

2. **Reconstruct the Approval Modal Interface via shadcn/ui Dialog**:
   - Migrate legacy absolute MUI `Modal` popups into an accessible, responsive `shadcn/ui` `<Dialog>` component template.
   - Fetch pending applications dynamically on initialize by querying `public.trackers` rows filtered by `status === 'new'` and intersecting with the target teammate's `user_id`.
   - Implement an elegant structural `<Table>` rendering columns: **Date** (formatted via `d MMM y`), **Description** (textarea notes), and explicit **Action Trigger Buttons**.

3. **Wire Status Modification Mutations (Saga Layer)**:
   - Map administrative action triggers to generic mutation actions: `updateTrackerStatusAction({ id, status })`.
   - The underlying Saga interceptor patches the target row within the Supabase `trackers` schema table.
   - **On Success**: Dispatch notification alerts via `toast.success()`, immediately prune the modified item from the manager's pending table state arrays, and force a refresh on the global tracker calendar counters.

---

### Database Query Blueprint (Saga Approval Context)

Since Row Level Security (RLS) policies permit managers and administrators full structural modification rights on trackers, updates can be executed via a direct table patch:

```typescript
import { supabase } from "@/shared/lib/supabaseClient";

// Worker snippet resolving administrative approvals or rejections
export function* updateTrackerStatusSagaWorker(
  action: PayloadAction<{ id: string; status: "approved" | "rejected" }>,
) {
  try {
    const { id, status } = action.payload;

    const { data, error } = yield call(() =>
      supabase.from("trackers").update({ status }).eq("id", id).select(),
    );

    if (error) throw error;

    yield put(updateTrackerStatusSuccess({ id, status }));
    // Trigger calendar rows refetch to cascade calculations down
  } catch (err: any) {
    yield put(updateTrackerStatusFailure(err.message));
  }
}
````

### Definition of Done (DoD)

- Component structures are fully cleansed of legacy @mui/material and absolute layouts.
- Annual balance computations aggregate correctly based on project types, skipping unapproved vacation days from final counters.
- The approval modal presents a clean empty state block if no pending leave rows are retrieved from the database.
- Clicking Approve or Reject triggers immediate updates to the tracker status via Supabase, dispatches reactive actions, clears out the rows smoothly, and updates totals.

## 📋 Task 2.6: Implement Time Inspector Summary Widget (Middle)

### Description

Migrate the legacy `TimeInspector` component into a modern `shadcn/ui` based summary card. This widget provides clear analytical insights regarding tracked hours collapsed by day, week, or calendar month views. It aggregates approved and pending hours across active projects, separates non-profit absence logs (vacations, sick leaves) from commercial project timesheets, and validates totals against variable operational target limits (based on a strict 5-hour work day baseline discovered in legacy configurations).

### Technical Specification

- **Target Component**: `src/features/tracker/components/TimeInspectorWidget.tsx`
- **UI Toolkit**: `shadcn/ui` (`Tabs`, `List`, `Divider`, `Progress`, `Card`, `Skeleton`)
- **State Operations**: Queries the `public.trackers` slice using date range bounding vectors.
- **Core Target Baseline**: `HOURS_PER_DAY = 5` (Preserve legacy compliance calculations).

### Sub-tasks for Developer

1. **Reconstruct Period Interval Controls Layout**:
   - Implement a smooth `<Tabs defaultValue="day">` selection layout wrapper to replace the legacy MUI button group interface.
   - Generate dynamic time ranges using `date-fns`:
     - **Day**: Target date string matching selected calendar focus day.
     - **Week**: Bound intervals between `startOfWeek` and `endOfWeek`.
     - **Month**: Bounded between `startOfMonth` and `endOfMonth`.
   - Calculate dynamic period limits: multiply valid non-weekend working days within the period by the system target constraint (`5` hours).

2. **Develop the Redux Aggregator Selector Logic**:
   - Create a memoized selector `selectTimeInspectorSummary` inside `trackers.slice.ts` that consumes active tracker items and groups them dynamically:
     - Exclude items where `status === 'rejected'`.
     - Group rows sharing identical `project_id`.
     - Sum `duration_minutes` for each project bucket.
     - Isolate system entries where project name is marked as `'vacation'`, `'sickness'`, or `'unpaid'`, and roll them into a singular virtual entry row labeled **"Vacation"**.
     - Convert final summed minutes into standard `HH:mm` display layouts.

3. **Refactor Responsive Layout Presentation**:
   - Safely render the breakdown list of commercial projects with text-overflow truncation properties handled by Tailwind classes (`truncate pr-12`).
   - Render the total summary progress bar: show the proportional load ratio (`computed total hours / period limit`) for regular workers.
   - Enforce administrative context safety: if a Manager views this card inside the Team/Crew control directory path, strip out the static capacity limits and render raw accumulation figures only.

---

### Frontend Aggregation Logic Blueprint

The developer should implement data reduction inside the slice selectors to keep component layouts pure:

```typescript
// Conceptual model for the Redux Selector processing tracker logs
export const selectTimeInspectorSummary = createSelector(
  [selectAllTrackers, selectCurrentPeriod],
  (trackers, period) => {
    let totalMinutes = 0;
    const projectMap: Record<string, { name: string; minutes: number }> = {};
    let vacationMinutes = 0;

    trackers.forEach((item) => {
      if (item.status === "rejected") return;

      totalMinutes += item.duration_minutes;
      const isAbsence = ["vacation", "sickness", "unpaid"].includes(
        item.project?.name?.toLowerCase(),
      );

      if (isAbsence) {
        vacationMinutes += item.duration_minutes;
      } else {
        const pId = item.project_id;
        if (!projectMap[pId])
          projectMap[pId] = { name: item.project.name, minutes: 0 };
        projectMap[pId].minutes += item.duration_minutes;
      }
    });

    return {
      projects: Object.values(projectMap),
      vacationTotal: vacationMinutes,
      grandTotal: totalMinutes,
    };
  },
);
```

### Definition of Done (DoD)

- Tabs cleanly toggle between Day, Week, and Month filters, recalculating target hour capacities instantly.
- Project names and accumulated timesheets align precisely, matching numbers seen on the dashboard calendar viewports.
- Rejected tracker rows are completely omitted from summary totals.
- Total working minutes are transformed correctly into HH:mm layouts without throwing mathematical floating-point rounding bugs.
- All legacy material button group nodes are swapped for semantic tailwind styled components.
