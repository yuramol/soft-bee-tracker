# EPIC 1: Authentication, Extended Profiles & Global Middleware

This epic covers the full setup of the security layer, typesafe state management for authentication, extended registration metadata matching our database schema, and native Next.js middleware route protection.

---

## 📋 Task 1.1: Implement Login Screen with TanStack Query & NextAuth (Middle)

### Description

Create the primary entry point of the application at the /login route. Implement form handling using React Hook Form + Zod, authentication side-effects via TanStack Query mutations in `lib/api/auth`, and handle session management via NextAuth linked to Supabase Auth.

### Technical Specification

- **Route**: /login
- **Form Handling**: react-hook-form with @hookform/resolvers/zod
- **Notifications**: sonner for toast error/success displays
- **State Pipeline**: Call `useSignIn` mutation → `signInWithCredentials` helper in `lib/api/auth/mutations.ts` → `onSuccess` redirect to `/dashboard` / `onError` toast via mutation callback
- **UI State**: Bind submit loading to `useSignIn().isPending`; optional ephemeral flags in `src/features/auth/store/auth.store.ts` (Zustand) — never duplicate session data in Zustand

### Sub-tasks for Developer

1. Develop a responsive login form layout using TailwindCSS. Fields required: **Email** and **Password**.
2. Create strict Zod validation schema: email must be valid format, password must be minimum 8 characters long, contain at least 1 uppercase letter, 1 lowercase letter, and 1 number. Catch and render inline validation errors.
3. Add navigation links pointing to /register ("Not registered yet?") and /forgot-password ("Forgot password?").
4. Add `src/lib/api/auth/` module (`index.ts`, `queries.ts`, `mutations.ts`, `types.ts`). Implement `signInWithCredentials` pure helper and `useSignIn` mutation hook.
5. Inside the mutation helper, execute the NextAuth `signIn` method with credentials, passing email and password, with `redirect` set to `false`.
6. Handle the mutation result in `useSignIn`:
   - **On Failure**: `toast.error` with the API error message; surface `error` from the hook if inline display is needed.
   - **On Success**: `toast.success` ("Welcome back!"), invalidate auth/session query keys, and `router.push('/dashboard')`.
7. Scaffold `src/features/auth/store/auth.store.ts` (Zustand) only for client UI state if needed (e.g. remember-email toggle). Do **not** store `userSessionData` or loading flags that TanStack Query already exposes.

### Definition of Done (DoD)

- Form client-side validation blocks invalid API calls natively.
- Password field enforces complexity rules (>=8 chars, 1 uppercase, 1 lowercase, 1 digit) before submitting.
- Loading states bind to the submit button via `useSignIn().isPending`.
- Successful login establishes a valid NextAuth session cookie and moves the user to /dashboard.

---

## 📋 Task 1.2: Implement Registration Screen with Extended Metadata (Middle)

### Description

Build the /register workflow. Because our application relies on a strict custom table structure inside public.users, the registration form must capture extended profile data and inject it into the Supabase user signup metadata payload so that our database triggers can populate the profile correctly.

### Technical Specification

- **Route**: /register
- **Default Assigned App Role**: 'worker'
- **Form Fields**:
  - Username (username - string, unique, required)
  - Email (email - string, unique, required)
  - First Name (first_name - string, required)
  - Last Name (last_name - string, required)
  - Phone (phone - string, optional)
  - LinkedIn URL (linkedin - string, optional, valid URL format)
  - Upwork URL (upwork - string, optional, valid URL format)
  - Password (string, min 8 characters, 1 uppercase, 1 lowercase, 1 number, required)
  - Confirm Password (string, must match Password)

### Sub-tasks for Developer

1. Build the registration form layout matching the listed extended fields using TailwindCSS grid for a clean look.
2. Form validation via Zod: enforce required fields, clean regex for telephone digits, strict URL parsing for LinkedIn/Upwork links.
3. Implement strict Zod password regex rules: minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, and 1 number. Ensure a cross-check confirming that password matches confirmPassword.
4. Add a link "Already have an account? Log In" redirecting to /login.
5. Wire the submit handler to `useSignUp().mutate(extendedPayload)`.
6. Implement `signUpWithProfile` pure helper and `useSignUp` mutation in `src/lib/api/auth/mutations.ts` with typed request/response interfaces in `types.ts`.
7. In the mutation helper, call `supabase.auth.signUp`. You **must** map the data parameters exactly into `options.data`, ensuring fields like role, username, first_name, last_name, phone, linkedin, upwork, is_confirmed (false), and is_blocked (false) are strictly populated.
8. **Mutation callbacks**:
   - **On Success**: `toast.success` ("Account created! Please check your email to verify your profile."), invalidate relevant auth keys, and `router.push('/login')`.
   - **On Failure**: `toast.error` with the API message; reset form via react-hook-form if needed.

### Definition of Done (DoD)

- Zod schema intercepts invalid input fields or passwords failing the complexity criteria locally.
- Creating an account fires a payload that populates the metadata context inside Supabase Auth backend.
- App displays an explicit confirmation alert using sonner.

---

## 📋 Task 1.3: Implement Password Recovery Flow (Junior / Middle)

### Description

Implement the dual-view password recovery system. This handles both sending out a password reset link via email, and providing the protected interface for setting the new password string after a user follows the token link.

### Technical Specification

- **Routes**: /forgot-password (Request view) and /auth/update-password (Reset view)
- **API Hooks**: `useRecoverPassword` and `useUpdatePassword` in `src/lib/api/auth/mutations.ts`

### Sub-tasks for Developer

1. **Build Forgot Password View (/forgot-password)**:
   - Create form with single field: Email. Add return link to /login.
   - On submit, call `useRecoverPassword().mutate({ email })`.
   - Inside the mutation helper, call `supabase.auth.resetPasswordForEmail` targeting the user email, with a `redirectTo` parameter pointing to the `/auth/update-password` client route.
   - On success, `toast.success` ("Reset link sent! Please check your mailbox.").
2. **Build Update Password View (/auth/update-password)**:
   - Create form fields: New Password and Confirm New Password.
   - Ensure Zod validation manages matching inputs and strictly enforces security complexity layout (minimum 8 characters, 1 uppercase, 1 lowercase, 1 number).
   - On submit, call `useUpdatePassword().mutate({ password })`.
   - Inside the mutation helper, invoke `supabase.auth.updateUser` passing the new password string.
   - On success, `toast.success` ("Password changed! You can now log in.") and `router.push('/login')`.

### Definition of Done (DoD)

- Submitting email successfully sends out a secure Supabase recovery token email.
- The application intercepts the login hash parameters when land-routed from the email link.
- Changing password requires meeting the strict complexity schema before making database modifications.
- Password mutation updates the authentication records in the Supabase instance data layer.

---

## 📋 Task 1.4: Implement Next.js Global Middleware & NextAuth Handlers (Senior / Tech Lead)

### Description

Create a global route protection layer using a native Next.js middleware.ts file to intercept router requests, and set up NextAuth dynamic configurations to manage cookie session tracking and role-based parsing.

### Technical Specification

- **Files**: src/middleware.ts and src/app/api/auth/[...nextauth]/route.ts
- **Session Target**: Inject Supabase access_token and custom profile role into NextAuth token instances.

### Sub-tasks for Developer

1. Scaffold NextAuth dynamic route configuration. Inside the CredentialsProvider.authorize block, connect incoming inputs to verify credentials against Supabase Auth.
2. Implement NextAuth JWT and Session callback pipelines:
   - **JWT Callback**: Map the user role metadata string from user.raw_user_meta_data.role directly into the encrypted NextAuth token object.
   - **Session Callback**: Forward token.role and token.accessToken onto the client-facing session payload context.
3. Create middleware.ts at your source folder root.
4. Declare a middleware route matcher array. Ensure it covers all secure views (/dashboard, /projects, /trackers) while safely excluding public folders, Next.js assets, and auth routes (/login, /register, /forgot-password).
5. Write middleware intercept logic using getToken:
   - **Condition A**: User is not logged in, but tries to access a protected dashboard path -> Redirect to /login.
   - **Condition B**: User has an active session cookie, but tries to visit /login or /register -> Redirect straight to /dashboard.

### Definition of Done (DoD)

- Protected pages are unreachable for unauthenticated clients, bouncing them to /login.
- Active users cannot access registration or log-in layout containers.
- User roles (worker, manager, admin) are exposed via useSession or getServerSession across components.

# EPIC 1: CORE INFRASTRUCTURE - DATABASE ALIGNED AUTH

## 📋 Task 1.5: Scaffold NextAuth Configuration (auth.ts) & Core Middleware Layer (Senior / Tech Lead)

### Description

Implement the main authentication engine for the application by creating the root auth.ts entry point and the global route protection edge middleware. This task adapts NextAuth to synchronize dynamically with the custom public.users schema, mapping native UUID identifiers, custom roles, and specific workflow flags like is_blocked and positions.

### Technical Specification

- **Configuration File**: ./auth.ts (Root of the application)
- **Middleware File**: ./src/middleware.ts
- **Database Model Matching**: Explicit mapping against public.users layout (UUID id, is_blocked, positions JSONB, salary tracking strings).

### Sub-tasks for Developer

1. **Scaffold Aligned Core Engine (./auth.ts)**:
   - Build the fetchUser database lookup function targeting the email record. Ensure it pulls fields strictly modeled after the SQL blueprint (avatar_url, date_employment, type_salary, upwork, etc.).
   - Ensure user sign-in is immediately aborted if the user profile contains `is_blocked === true`.
   - Map the Supabase context cleanly inside the JWT callback. Populate the active JWT instance using our accurate types (injecting payload fields like username, phone, and positions).
   - Project full database profiles onto the client session object. This gives frontend components instant access to user metadata (e.g., checking if session.user.role is 'manager' or accessing session.user.avatar_url).

2. **Implement Type Augmentations**:
   - Overwrite the default NextAuth User shape to reflect our accurate database structure: change id to a string (UUID), map role using our explicit type, and declare specific domain fields (positions, salary, upwork, linkedin).

3. **Develop Native Edge Middleware (./src/middleware.ts)**:
   - Maintain the optimized, zero-cache edge protection router.
   - Redirect traffic dynamically based on auth status: non-logged-in users trying to access secure pages are sent to /login, while active clients hitting /login or /register are bounced directly to /dashboard.

---

### Code Reference Templates (For Raw Implementation Blueprint)

#### Root Authentication Setup File (./auth.ts Blueprint)

/_ eslint-disable _/
// @ts-nocheck
import NextAuth, { NextAuthConfig, DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';
import { supabaseAdminClient } from '@/shared/clients/supabaseAdmin';

export type UserRole = 'worker' | 'manager' | 'admin';
export type SalaryType = 'hourly' | 'fixed' | 'project'; // Aligns with public.salary_type ENUM

export interface UserPositions {
titles: string[];
}

const fetchUser = async (email: string) => {
try {
const { data, error } = await supabaseAdminClient
.from('users')
.select('\*')
.eq('email', email)
.single();

        if (error || !data) return undefined;
        return data;
    } catch (e) {
        console.error('### fetchUser Error:', e);
        return undefined;
    }

};

export const { handlers, auth, signIn, signOut } = NextAuth({
trustHost: true,
secret: process.env.NEXTAUTH_SECRET,
debug: true,
pages: {
signIn: '/login'
},
providers: [],
callbacks: {
async signIn({ user }) {
if (user?.is_blocked) {
console.log(`### User ${user.email} is blocked inside public.users. Aborting login.`);
return false;
}
return true;
},
async jwt({ token, user }) {
if (user) {
console.log('### JWT Processing: Population metadata from public.users configuration...');
const profile = await fetchUser(user.email!);

                if (!profile) {
                    token.signedup = false;
                } else {
                    token.signedup = true;
                    token.user_id = profile.id; // Strict UUID string mapping
                    token.username = profile.username;
                    token.role = profile.role as UserRole;
                    token.first_name = profile.first_name;
                    token.last_name = profile.last_name;
                    token.phone = profile.phone;
                    token.avatar_url = profile.avatar_url;
                    token.date_employment = profile.date_employment;
                    token.positions = profile.positions as UserPositions;
                    token.salary = profile.salary;
                    token.salary_info = profile.salary_info;
                    token.type_salary = profile.type_salary as SalaryType;
                    token.linkedin = profile.linkedin;
                    token.upwork = profile.upwork;
                    token.is_confirmed = profile.is_confirmed;
                    token.disabled = profile.is_blocked; // Binds profile flag back to next-auth internal block check
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.signedup = token.signedup;
            if (session.user) {
                session.user.id = token.user_id;
                session.user.username = token.username;
                session.user.role = token.role;
                session.user.first_name = token.first_name;
                session.user.last_name = token.last_name;
                session.user.phone = token.phone;
                session.user.avatar_url = token.avatar_url;
                session.user.date_employment = token.date_employment;
                session.user.positions = token.positions;
                session.user.salary = token.salary;
                session.user.salary_info = token.salary_info;
                session.user.type_salary = token.type_salary;
                session.user.linkedin = token.linkedin;
                session.user.upwork = token.upwork;
                session.user.is_confirmed = token.is_confirmed;
                session.user.is_blocked = token.disabled;
            }
            return session;
        }
    },
    cookies: {
        sessionToken: {
            name: `authjs.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            }
        }
    }

}) satisfies NextAuthConfig;

declare module 'next-auth' {
interface Session extends DefaultSession {
signedup: boolean;
user: User;
}
interface User extends DefaultUser {
id: string; // Updated to match UUID key structure
username: string;
email: string;
role: UserRole;
first_name: string;
last_name: string;
phone: string | null;
avatar_url: string | null;
date_employment: string | null;
positions: UserPositions | null;
salary: number | null;
salary_info: string | null;
type_salary: SalaryType | null;
linkedin: string | null;
upwork: string | null;
is_confirmed: boolean;
is_blocked: boolean;
}
}

declare module 'next-auth/jwt' {
interface JWT extends DefaultJWT {
signedup: boolean;
user_id: string;
username: string;
role: UserRole;
first_name: string;
last_name: string;
phone: string | null;
avatar_url: string | null;
date_employment: string | null;
positions: UserPositions | null;
salary: number | null;
salary_info: string | null;
type_salary: SalaryType | null;
linkedin: string | null;
upwork: string | null;
is_confirmed: boolean;
disabled: boolean;
}
}

export type { User, Session };

#### Core Route Protection File (./src/middleware.ts Blueprint)

import { NextResponse } from 'next/server';
import { NextURL } from 'next/dist/server/web/next-url';
import { auth } from '@/auth';

const NO_CACHE_HEADERS = {
'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
Pragma: 'no-cache',
Expires: '0',
'x-middleware-cache': 'no-cache'
};

const createRedirectResponse = (toUrl: string, nextUrl: NextURL) => {
const response = NextResponse.redirect(new URL(toUrl, nextUrl));
Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => {
response.headers.set(key, value);
});
return response;
};

export default auth(req => {
const { nextUrl } = req;
const isLoggedIn = !!req.auth;
const isPublicRoute = ['/login', '/register', '/forgot-password'].includes(nextUrl.pathname);
const isProtectedRoute = !isPublicRoute;

    // Rule A: Block unauthenticated users trying to access app views
    if (isProtectedRoute && !isLoggedIn) {
        return createRedirectResponse('/login', nextUrl);
    }

    // Rule B: Redirect authorized clients away from authentication pages
    if (isPublicRoute && isLoggedIn) {
        return createRedirectResponse('/dashboard', nextUrl);
    }

    const response = NextResponse.next();
    Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;

});

export const config = {
matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
};

---

### Definition of Done (DoD)

- The root auth.ts file explicitly references user identifiers as database-compliant UUID strings.
- Type definitions are extended to correctly recognize specific application fields like username, salary configurations, positions JSONB objects, and user upwork/linkedin links.
- Middleware enforces absolute view boundaries: blocked users or non-authenticated requests bounce back instantly to /login.
