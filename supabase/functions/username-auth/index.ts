import { createSupabaseContext } from 'npm:@supabase/server'

const siteOrigin = 'https://thwwins96.github.io'
const corsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin') || siteOrigin
  const allowedOrigin = origin === siteOrigin || /^http:\/\/localhost(:\d+)?$/.test(origin) ? origin : siteOrigin
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
}

function respond(request: Request, payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return respond(request, { error: 'Метод запроса не поддерживается.' }, 405)

  const { data: context, error: contextError } = await createSupabaseContext(request, { auth: 'publishable' })
  if (contextError || !context) return respond(request, { error: 'Не удалось подключиться к сервису аккаунтов.' }, contextError?.status || 401)

  try {
    const body = await request.json()
    const action = body?.action
    const username = String(body?.username || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!['signup', 'login'].includes(action)) return respond(request, { error: 'Неизвестное действие.' }, 400)
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return respond(request, { error: 'Ник: от 3 до 24 латинских букв, цифр или символов _.' }, 400)
    if (password.length < 6 || password.length > 128) return respond(request, { error: 'Пароль должен содержать не менее 6 символов.' }, 400)

    const admin = context.supabaseAdmin
    const publicClient = context.supabase

    if (action === 'signup') {
      const existing = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
      if (existing.error) return respond(request, { error: 'Не удалось проверить ник. Попробуй ещё раз.' }, 500)
      if (existing.data) return respond(request, { error: 'Этот ник уже занят.' }, 409)

      const email = crypto.randomUUID() + '@accounts.iskra.invalid'
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: username, username }
      })
      if (created.error || !created.data.user) return respond(request, { error: 'Не удалось создать аккаунт. Проверь пароль и попробуй снова.' }, 400)

      const profile = await admin.from('profiles').update({ username, display_name: username }).eq('id', created.data.user.id)
      if (profile.error) {
        await admin.auth.admin.deleteUser(created.data.user.id)
        return respond(request, { error: profile.error.code === '23505' ? 'Этот ник уже занят.' : 'Не удалось сохранить профиль.' }, profile.error.code === '23505' ? 409 : 500)
      }
    }

    let account = await admin.from('profiles').select('id').eq('username', username).limit(2)
    if (account.error) return respond(request, { error: 'Неверный ник или пароль.' }, 401)
    let matchingProfile = account.data?.length === 1 ? account.data[0] : null

    // Keep existing accounts reachable by their display name if they have not chosen a username yet.
    if (!matchingProfile && (!account.data || account.data.length === 0)) {
      const legacy = await admin.from('profiles').select('id').ilike('display_name', username).limit(2)
      if (legacy.data?.length === 1) matchingProfile = legacy.data[0]
    }
    if (!matchingProfile) return respond(request, { error: 'Неверный ник или пароль.' }, 401)

    const authUser = await admin.auth.admin.getUserById(matchingProfile.id)
    const email = authUser.data.user?.email
    if (authUser.error || !email) return respond(request, { error: 'Неверный ник или пароль.' }, 401)

    const signedIn = await publicClient.auth.signInWithPassword({ email, password })
    if (signedIn.error || !signedIn.data.session) return respond(request, { error: 'Неверный ник или пароль.' }, 401)

    return respond(request, {
      session: {
        access_token: signedIn.data.session.access_token,
        refresh_token: signedIn.data.session.refresh_token
      }
    })
  } catch {
    return respond(request, { error: 'Не удалось обработать запрос. Попробуй ещё раз.' }, 400)
  }
})

