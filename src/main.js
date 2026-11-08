const db = window.supabase.createClient(
  'https://cmgetnjnuuetganbjwdm.supabase.co',
  'sb_publishable_ptqhR6KtS7K8Bs3L5N0dPw_f5NQiy4L'
)

const cats = [['all', 'Всё', '✳'], ['3d', '3D и Blender', '◈'], ['art', 'Рисунки', '✳'], ['games', 'Игры', '⌘'], ['photo', 'Фото и видео', '▧'], ['code', 'Код и проекты', '⟡'], ['other', 'Другое', '✦']]
const sample = [
  { id: '1', title: 'Лесной дух', description: 'Эксперимент со светом и объёмом.', category_id: '3d', profiles: { display_name: 'Мира' }, created_at: '2026-11-07', demo: true },
  { id: '2', title: 'После дождя', description: 'Город, который никуда не торопится.', category_id: 'art', profiles: { display_name: 'Саша' }, created_at: '2026-11-06', demo: true },
  { id: '3', title: 'Маяк', description: 'Первый экран игры об океане.', category_id: 'games', profiles: { display_name: 'Тёма' }, created_at: '2026-11-04', demo: true }
]

let user = null, profile = null, works = sample, filter = 'all', modal = '', mode = 'signup'
let selectedWorkId = null, workLikes = 0, likedByMe = false, comments = [], detailMessage = '', workImages = [], imageIndex = 0
const $ = selector => document.querySelector(selector)
const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const safeUrl = value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? esc(url.href) : '' } catch { return '' } }
const cat = id => cats.find(category => category[0] === id) || cats[6]
const initials = value => (value || 'Т').trim().split(/\s+/).map(part => part[0]).join('').toUpperCase()
const randomGuestName = () => {
  const names = ['ТихийЛис', 'МятныйКосмос', 'СонныйКит', 'ЛунныйЁж', 'ЯркийМох', 'ОблачныйКот', 'СинийВетер', 'ТёплыйЧай', 'ИскристыйПиксель', 'МаленькийКомет']
  return names[Math.floor(Math.random() * names.length)] + Math.floor(10 + Math.random() * 90)
}
let guestName = sessionStorage.getItem('iskra_guest_name')
if (!guestName) { guestName = randomGuestName(); sessionStorage.setItem('iskra_guest_name', guestName) }

function streak() {
  if (!user) return 0
  const days = new Set(works.filter(work => work.owner_id === user.id).map(work => new Date(work.created_at).toLocaleDateString('sv-SE')))
  const date = new Date(); date.setHours(0, 0, 0, 0)
  if (!days.has(date.toLocaleDateString('sv-SE'))) date.setDate(date.getDate() - 1)
  let count = 0
  while (days.has(date.toLocaleDateString('sv-SE'))) { count++; date.setDate(date.getDate() - 1) }
  return count
}

function cover(work, index = 0, className = '') {
  if (work.image_url) return '<img class="cover ' + className + '" src="' + esc(work.image_url) + '" alt="' + esc(work.title) + '">'
  const colors = [['#d3e0c0', '#5b7862', '#273c35'], ['#e7c8ba', '#9c6e78', '#483d59'], ['#efdca2', '#b88851', '#4a5960']][index % 3]
  return '<div class="art ' + className + '" style="--a:' + colors[0] + ';--b:' + colors[1] + ';--c:' + colors[2] + '"><span>' + cat(work.category_id)[2] + '</span></div>'
}

function render() {
  const count = streak(), random = works[Math.floor(Math.random() * works.length)] || sample[0]
  const shown = filter === 'all' ? works : works.filter(work => work.category_id === filter)
  $('#app').innerHTML = '<header><a class="brand" href="#home">✳ искра<span>.</span></a><nav><a href="#home">Главная</a><a href="#gallery">Галерея</a><a href="#about">О проекте</a></nav><div>' + (user ? '<button id="profile">' + esc(profile?.display_name || 'Профиль') + '</button>' : '<button id="login">Войти</button> <button class="small" id="signup">Начать бесплатно ↗</button>') + '</div></header><main id="home"><section class="hero"><div><small>✦ &nbsp;ТВОЁ МЕСТО ДЛЯ СОЗДАНИЯ</small><h1>Каждая идея<br>заслуживает <em>места.</em></h1><p>Собирай всё, что создаёшь: от первого наброска до готовой игры. Замечай свой рост и делись им с миром.</p><button class="primary" id="add">Добавить работу　＋</button><a class="link" href="#gallery">Исследовать галерею ↓</a></div><div class="heroart"><div class="ring"></div><div class="orb">✳</div><div class="float">✳ &nbsp; Сегодня — хороший день<small>чтобы что-нибудь создать</small></div><div class="float second">♨ &nbsp;' + count + ' дней<small>твой творческий ритм</small></div></div></section><section class="stats"><div>✳ <b>' + works.length + '</b><small>работ в галерее</small></div><div>♨ <b>' + count + ' дней</b><small>твоя серия</small></div><div>◈ <b>' + (user ? works.filter(work => work.owner_id === user.id).length : 0) + '</b><small>твоих работ</small></div><span>Каждая работа — часть твоей истории ↗</span></section><section class="section"><small>СЛУЧАЙНАЯ ИСКРА</small><h2>Вдохновение рядом <button id="shuffle">⟳ Другая работа</button></h2><article class="featured clickable" data-work="' + esc(random.id) + '">' + cover(random, 1) + '<div><label>' + cat(random.category_id)[2] + ' ' + cat(random.category_id)[1] + '</label><h3>' + esc(random.title) + '</h3><p>' + esc(random.description) + '</p><small>СОЗДАТЕЛЬ<br><b>' + esc(random.profiles?.display_name) + '</b></small><span class="open-hint">Открыть работу ↗</span></div></article></section><section class="section" id="gallery"><small>ТВОЯ ВСЕЛЕННАЯ</small><h2>Галерея работ</h2><div class="filters">' + cats.map(category => '<button data-filter="' + category[0] + '" class="filter ' + (filter === category[0] ? 'on' : '') + '">' + category[2] + ' ' + category[1] + '</button>').join('') + ' <button id="add2" class="outline">＋ Добавить работу</button></div><div class="grid">' + shown.map((work, index) => '<article class="work clickable" data-work="' + esc(work.id) + '" tabindex="0" role="button" aria-label="Открыть работу ' + esc(work.title) + '">' + cover(work, index) + '<div><small>' + cat(work.category_id)[2] + ' ' + cat(work.category_id)[1] + '　·　' + new Date(work.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + '</small><h3>' + esc(work.title) + '</h3><p>' + esc(work.description) + '</p><footer>◉ &nbsp;' + esc(work.profiles?.display_name || 'Автор') + (work.demo ? '<i>пример</i>' : '') + '</footer></div></article>').join('') + '</div></section><section class="streak"><b>♨</b><div><small>ТВОЙ ТЕМП — ТВОИ ПРАВИЛА</small><h2>Не нужно быть идеальным.<br><em>Просто продолжай.</em></h2><p>Добавь хотя бы одну работу за день — и огонёк останется с тобой.</p></div><aside>ТВОЙ ОГОНЁК<h3>♨ ' + count + ' дней</h3></aside></section><section class="join" id="about"><div><small>НАЧНИ СЕГОДНЯ</small><h2>Твои идеи заслуживают<br>быть <em>увиденными.</em></h2></div><button id="join" class="primary">' + (user ? 'Добавить работу' : 'Создать свой профиль') + ' ↗</button></section></main><footer class="bottom"><b>✳ искра.</b><span>Место, где идеи становятся историей.</span></footer>' + (modal ? dialog() : '') + (selectedWorkId ? detailDialog() : '')
  bind()
}

function dialog() {
  if (modal === 'auth') return '<div class="shade" id="shade"><section class="modal"><button class="close" data-close>×</button><small>ТВОЯ ИСКРА НАЧИНАЕТСЯ ЗДЕСЬ</small><h2>' + (mode === 'signup' ? 'Создай свой профиль' : 'С возвращением') + '</h2><p>Сохраняй работы и отмечай каждый творческий день.</p><form id="auth">' + (mode === 'signup' ? '<label>Как тебя называть<input name="display_name" required></label>' : '') + '<label>Электронная почта<input name="email" type="email" required></label><label>Пароль<input name="password" type="password" minlength="6" required></label><button class="primary full">' + (mode === 'signup' ? 'Создать аккаунт' : 'Войти') + '</button><div id="message"></div></form><button id="switch" class="switch">' + (mode === 'signup' ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт') + '</button></section></div>'
  if (modal === 'work') return '<div class="shade" id="shade"><section class="modal"><button class="close" data-close>×</button><small>НОВАЯ ГЛАВА</small><h2>Добавить работу</h2><form id="workform"><label>Название<input name="title" required maxlength="120"></label><label>Раздел<select name="category_id">' + cats.slice(1).map(category => '<option value="' + category[0] + '">' + category[2] + ' ' + category[1] + '</option>').join('') + '</select></label><label>Коротко о работе<textarea name="description" rows="3"></textarea></label><label>Изображения<input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple><small class="field-hint">Можно выбрать несколько изображений — JPG, PNG, WEBP или GIF, до 50 МБ каждое.</small></label><label>Ссылка на проект<input name="project_url" type="url"></label><button class="primary full">Сохранить работу</button><div id="message"></div></form></section></div>'
  return '<div class="shade" id="shade"><section class="modal"><button class="close" data-close>×</button><small>ТВОЯ СТРАНИЦА</small><h2>Настроить профиль</h2><form id="profileform"><label>Имя<input name="display_name" required value="' + esc(profile?.display_name) + '"></label><label>Имя пользователя<input name="username" pattern="[A-Za-z0-9_]+" value="' + esc(profile?.username) + '"></label><label>О себе<textarea name="bio">' + esc(profile?.bio) + '</textarea></label><button class="primary full">Сохранить профиль</button><div id="message"></div></form><button id="signout">Выйти из аккаунта</button></section></div>'
}

function detailDialog() {
  const work = works.find(item => String(item.id) === String(selectedWorkId))
  if (!work) return ''
  const imageList = workImages.length ? workImages : (work.image_url ? [{ image_url: work.image_url }] : [])
  const activeImage = imageList[imageIndex]?.image_url
  const image = activeImage ? '<img class="detail-image" src="' + esc(activeImage) + '" alt="' + esc(work.title) + ' — изображение ' + (imageIndex + 1) + '">' : cover(work, Math.max(0, works.indexOf(work)), 'detail-art')
  const imageControls = imageList.length > 1 ? '<div class="image-controls"><button id="previousImage" aria-label="Предыдущее изображение">←</button><span>' + (imageIndex + 1) + ' / ' + imageList.length + '</span><button id="nextImage" aria-label="Следующее изображение">→</button></div>' : ''
  const commentList = comments.map(comment => '<article class="comment"><div class="comment-avatar">' + esc(initials(comment.author_name)) + '</div><div><b>' + esc(comment.author_name) + '</b><time>' + new Date(comment.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</time><p>' + esc(comment.body) + '</p></div></article>').join('')
  const projectUrl = safeUrl(work.project_url)
  return '<div class="detail-shade" id="detailShade"><section class="detail-view" role="dialog" aria-modal="true" aria-label="' + esc(work.title) + '"><button class="detail-close" id="detailClose" aria-label="Закрыть">×</button><div class="detail-artwork">' + image + imageControls + '</div><aside class="detail-panel"><small class="eyebrow">' + cat(work.category_id)[2] + ' ' + cat(work.category_id)[1] + ' · ' + new Date(work.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) + '</small><h2>' + esc(work.title) + '</h2><p class="detail-author">Автор: <b>' + esc(work.profiles?.display_name || 'Автор') + '</b></p>' + (user && work.owner_id === user.id ? '<button id="deleteWork" class="delete-work">Удалить работу</button>' : '') + '<p class="detail-description">' + esc(work.description || 'Автор пока не добавил описание.') + '</p>' + (projectUrl ? '<a class="project-link" href="' + projectUrl + '" target="_blank" rel="noopener noreferrer">Открыть проект ↗</a>' : '') + '<div class="detail-actions"><button class="like-button ' + (likedByMe ? 'liked' : '') + '" id="likeButton" ' + (user ? '' : 'title="Войди, чтобы поставить лайк"') + '><span>' + (likedByMe ? '♥' : '♡') + '</span> <b>' + workLikes + '</b> <span>лайков</span></button></div><div class="comments-heading"><h3>Комментарии</h3><span>' + comments.length + '</span></div><div class="comment-list" id="commentList">' + (commentList || '<p class="empty-comments">Пока нет комментариев. Будь первым!</p>') + '</div><form class="comment-form" id="commentForm"><div class="commenting-as">' + (user ? 'Пишешь как <b>' + esc(profile?.display_name || 'Автор') + '</b>' : 'Твой случайный ник: <b>' + esc(guestName) + '</b>') + '</div><textarea name="body" rows="3" maxlength="1000" required placeholder="Напиши что-нибудь хорошее…"></textarea><button class="primary">Оставить комментарий</button><div id="detailMessage" class="detail-message">' + esc(detailMessage) + '</div></form></aside></section></div>'
}

function bind() {
  $('#login')?.addEventListener('click', () => openAuth('login'))
  $('#signup')?.addEventListener('click', () => openAuth('signup'))
  $('#profile')?.addEventListener('click', () => { modal = 'profile'; render() })
  ;['#add', '#add2', '#join'].forEach(selector => $(selector)?.addEventListener('click', () => { if (!user) return openAuth('signup'); modal = 'work'; render() }))
  document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { filter = button.dataset.filter; render() })
  document.querySelectorAll('[data-work]').forEach(card => {
    card.addEventListener('click', event => { if (event.target.closest('a')) return; openWork(card.dataset.work) })
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openWork(card.dataset.work) } })
  })
  $('#shuffle')?.addEventListener('click', render)
  $('[data-close]')?.addEventListener('click', () => { modal = ''; render() })
  $('#shade')?.addEventListener('click', event => { if (event.target.id === 'shade') { modal = ''; render() } })
  $('#switch')?.addEventListener('click', () => openAuth(mode === 'signup' ? 'login' : 'signup'))
  $('#auth')?.addEventListener('submit', authSubmit)
  $('#workform')?.addEventListener('submit', workSubmit)
  $('#profileform')?.addEventListener('submit', profileSubmit)
  $('#signout')?.addEventListener('click', async () => { await db.auth.signOut(); modal = '' })
  $('#detailClose')?.addEventListener('click', closeWork)
  $('#detailShade')?.addEventListener('click', event => { if (event.target.id === 'detailShade') closeWork() })
  $('#likeButton')?.addEventListener('click', toggleLike)
  $('#deleteWork')?.addEventListener('click', deleteWork)
  $('#previousImage')?.addEventListener('click', () => { imageIndex = (imageIndex - 1 + workImages.length) % workImages.length; render() })
  $('#nextImage')?.addEventListener('click', () => { imageIndex = (imageIndex + 1) % workImages.length; render() })
  $('#commentForm')?.addEventListener('submit', commentSubmit)
  document.addEventListener('keydown', escapeDetail, { once: true })
}

function escapeDetail(event) { if (event.key === 'Escape' && selectedWorkId) closeWork() }
function closeWork() { selectedWorkId = null; comments = []; workImages = []; imageIndex = 0; detailMessage = ''; render() }
function openAuth(nextMode) { mode = nextMode; modal = 'auth'; render() }
function msg(text, bad = false) { const element = $('#message'); if (element) { element.textContent = text; element.className = bad ? 'error' : '' } }

async function openWork(id) {
  selectedWorkId = id; comments = []; workImages = []; imageIndex = 0; workLikes = 0; likedByMe = false; detailMessage = ''; render()
  const work = works.find(item => String(item.id) === String(id))
  if (work?.demo) { if (work.image_url) workImages = [{ image_url: work.image_url }]; render(); return }
  const [statsResult, likeResult, commentResult, imagesResult] = await Promise.all([
    db.from('works').select('likes_count').eq('id', id).single(),
    user ? db.from('work_likes').select('user_id').eq('work_id', id).eq('user_id', user.id) : Promise.resolve({ data: [], error: null }),
    db.from('work_comments').select('id,author_name,body,created_at').eq('work_id', id).order('created_at', { ascending: false }),
    db.from('work_images').select('image_url,sort_order').eq('work_id', id).order('sort_order')
  ])
  if (selectedWorkId !== id) return
  if (!statsResult.error) workLikes = statsResult.data.likes_count || 0
  if (!likeResult.error) likedByMe = !!user && likeResult.data.some(like => like.user_id === user.id)
  if (!commentResult.error) comments = commentResult.data
  else detailMessage = 'Не удалось загрузить комментарии. Попробуй обновить страницу.'
  if (!imagesResult.error && imagesResult.data.length) workImages = imagesResult.data
  else if (work.image_url) workImages = [{ image_url: work.image_url }]
  render()
}

async function toggleLike() {
  if (!user) return openAuth('login')
  const button = $('#likeButton')
  if (button) button.disabled = true
  const result = likedByMe
    ? await db.from('work_likes').delete().eq('work_id', selectedWorkId).eq('user_id', user.id)
    : await db.from('work_likes').insert({ work_id: selectedWorkId, user_id: user.id })
  if (result.error) { detailMessage = 'Не удалось сохранить лайк. Попробуй ещё раз.'; render(); return }
  await openWork(selectedWorkId)
}

function workImageStoragePath(imageUrl) {
  try {
    const url = new URL(imageUrl)
    const prefix = '/storage/v1/object/public/work-media/'
    if (url.origin !== 'https://cmgetnjnuuetganbjwdm.supabase.co' || !url.pathname.startsWith(prefix)) return null
    const path = decodeURIComponent(url.pathname.slice(prefix.length))
    return path.startsWith(user.id + '/') ? path : null
  } catch { return null }
}

async function deleteWork() {
  const work = works.find(item => String(item.id) === String(selectedWorkId))
  if (!user || !work || work.owner_id !== user.id) return
  if (!window.confirm('Удалить работу «' + work.title + '»? Это действие нельзя отменить.')) return
  const button = $('#deleteWork')
  if (button) { button.disabled = true; button.textContent = 'Удаляю…' }

  const imageRows = await db.from('work_images').select('image_url').eq('work_id', work.id)
  if (imageRows.error) {
    detailMessage = 'Не удалось получить список изображений. Работа не удалена.'
    render()
    return
  }
  const urls = [work.image_url, ...workImages.map(image => image.image_url), ...(imageRows.data || []).map(image => image.image_url)]
  const paths = [...new Set(urls.filter(Boolean).map(workImageStoragePath).filter(Boolean))]
  const { error } = await db.from('works').delete().eq('id', work.id).eq('owner_id', user.id)
  if (error) {
    detailMessage = 'Не удалось удалить работу: ' + error.message
    render()
    return
  }
  works = works.filter(item => String(item.id) !== String(work.id))
  closeWork()
  if (paths.length) {
    const cleanup = await db.storage.from('work-media').remove(paths)
    if (cleanup.error) console.warn('Не удалось удалить некоторые файлы работы из хранилища.', cleanup.error)
  }
  await load()
}

async function commentSubmit(event) {
  event.preventDefault()
  const body = new FormData(event.currentTarget).get('body').trim()
  const work = works.find(item => String(item.id) === String(selectedWorkId))
  if (work?.demo) { detailMessage = 'Это пример работы — комментарии сохраняются у опубликованных работ.'; render(); return }
  if (!body) return
  const button = $('#commentForm button'); if (button) button.disabled = true
  const result = await db.from('work_comments').insert({ work_id: selectedWorkId, author_id: user?.id || null, author_name: user ? (profile?.display_name || 'Автор') : guestName, body })
  if (result.error) { detailMessage = 'Не удалось отправить комментарий. Попробуй ещё раз.'; render(); return }
  await openWork(selectedWorkId)
}

async function authSubmit(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget), credentials = { email: form.get('email'), password: form.get('password') }
  const result = mode === 'signup'
    ? await db.auth.signUp({ ...credentials, options: { data: { display_name: form.get('display_name') } } })
    : await db.auth.signInWithPassword(credentials)
  if (result.error) return msg(result.error.message, true)
  if (mode === 'signup' && !result.data.session) return msg('Проверь почту и подтверди адрес — затем войди.')
  modal = ''; await load()
}

async function workSubmit(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget), files = form.getAll('images').filter(file => file instanceof File && file.size)
  const submitButton = $('#workform button[type="submit"]') || $('#workform button')
  if (submitButton) submitButton.disabled = true
  msg('Сохраняю…')
  const uploadedPaths = [], uploadedImages = []
  const fail = async message => {
    if (uploadedPaths.length) await db.storage.from('work-media').remove(uploadedPaths)
    msg(message, true)
    if (submitButton) submitButton.disabled = false
  }
  try {
    if (!user) return await fail('Войди в аккаунт, чтобы сохранить работу.')
    if (files.length > 12) return await fail('К одной работе можно прикрепить до 12 изображений.')
    if (files.some(file => file.size > 52428800)) return await fail('Каждое изображение должно быть меньше 50 МБ.')
    for (const file of files) {
      const path = user.id + '/' + crypto.randomUUID() + '-' + file.name.replace(/[^\w.-]/g, '_')
      const upload = await db.storage.from('work-media').upload(path, file)
      if (upload.error) return await fail('Не удалось загрузить «' + file.name + '»: ' + upload.error.message)
      uploadedPaths.push(path)
      uploadedImages.push({ image_url: db.storage.from('work-media').getPublicUrl(path).data.publicUrl, sort_order: uploadedImages.length })
    }
    const { data: created, error } = await db.from('works').insert({ owner_id: user.id, title: form.get('title'), category_id: form.get('category_id'), description: form.get('description'), project_url: form.get('project_url') || null, image_url: uploadedImages[0]?.image_url || null }).select('*').single()
    if (error) return await fail('Работа не сохранилась: ' + error.message)
    created.profiles = { display_name: profile?.display_name || 'Автор', username: profile?.username || null }
    if (uploadedImages.length) {
      const { error: imageError } = await db.from('work_images').insert(uploadedImages.map(image => ({ work_id: created.id, ...image })))
      if (imageError) {
        await db.from('works').delete().eq('id', created.id)
        return await fail('Работа создана, но изображения не прикрепились: ' + imageError.message)
      }
    }
    works = [created, ...works.filter(work => !work.demo && work.id !== created.id)]
    modal = ''
    render()
    await load()
  } catch (error) {
    await fail('Не удалось сохранить работу. Проверь соединение и попробуй снова.')
  }
}

async function profileSubmit(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const { error } = await db.from('profiles').update({ display_name: form.get('display_name'), username: form.get('username') || null, bio: form.get('bio') }).eq('id', user.id)
  if (error) return msg(error.code === '23505' ? 'Это имя пользователя уже занято.' : error.message, true)
  modal = ''; await load()
}

async function load() {
  const auth = await db.auth.getUser(); user = auth.data.user
  if (user) {
    let query = await db.from('profiles').select('*').eq('id', user.id).single()
    if (!query.data) {
      await db.from('profiles').insert({ id: user.id, display_name: user.user_metadata?.display_name || 'Творец' })
      query = await db.from('profiles').select('*').eq('id', user.id).single()
    }
    profile = query.data
  } else profile = null
  const result = await db.from('works').select('*').order('created_at', { ascending: false })
  if (result.data?.length) {
    const ownerIds = [...new Set(result.data.map(work => work.owner_id).filter(Boolean))]
    const profileResult = ownerIds.length ? await db.from('profiles').select('id,display_name,username').in('id', ownerIds) : { data: [] }
    const profilesById = new Map((profileResult.data || []).map(item => [item.id, item]))
    works = result.data.map(work => ({ ...work, profiles: profilesById.get(work.owner_id) || { display_name: 'Автор' } }))
  } else if (!result.error && !works.some(work => !work.demo)) works = sample
  if (selectedWorkId) await openWork(selectedWorkId)
  else render()
}

db.auth.onAuthStateChange(() => setTimeout(load, 0))
load()



