import type { EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

import { ROUTES } from '@/constants';
import { createServerClient } from '@/lib/supabase/server';

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

function parseEmailOtpType(value: string | null): EmailOtpType | null {
  return value && (EMAIL_OTP_TYPES as readonly string[]).includes(value) ? (value as EmailOtpType) : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = parseEmailOtpType(searchParams.get('type'));
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? ROUTES.DASHBOARD;

  const redirectTo = request.nextUrl.clone();
  // only allow internal paths to prevent open redirects via crafted links
  redirectTo.pathname = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : ROUTES.DASHBOARD;
  redirectTo.search = '';

  const supabase = await createServerClient();

  // primary flow: customized email templates link here with a token_hash
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  // fallback flow: default templates route through the pkce code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = ROUTES.LOGIN;
  return NextResponse.redirect(redirectTo);
}
