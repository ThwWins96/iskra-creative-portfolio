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
let selectedWorkId = null, workLikes = 0, myWorkReaction = null, comments = [], detailMessage = '', workImages = [], imageIndex = 0
let commentReactions = [], replyToId = null, feedWorks = [], notifications = []
let activityChannel = null, notificationChannel = null, notificationChannelUser = null
const $ = selector => document.querySelector(selector)
const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const safeUrl = value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? esc(url.href) : '' } catch { return '' } }
const cat = id => cats.find(category => category[0] === id) || cats[6]
const initials = value => (value || 'Т').trim().split(/\s+/).map(part => part[0]).join('').toUpperCase()
const avatarMarkup = (person, className = 'avatar') => safeUrl(person?.avatar_url) ? '<img class="' + className + '" src="' + safeUrl(person.avatar_url) + '" alt="Аватар ' + esc(person?.display_name || '') + '">' : '<span class="' + className + ' avatar-fallback">' + esc(initials(person?.display_name)) + '</span>'
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
  $('#app').innerHTML = '<header><a class="brand" href="#home">✳ искра<span>.</span></a><nav><a href="#home">Главная</a><a href="#gallery">Галерея</a><a href="#about">О проекте</a></nav><div>' + (user ? '<button id="profile" class="profile-button">' + avatarMarkup(profile, 'header-avatar') + '<span>' + esc(profile?.display_name || 'Профиль') + '</span></button>' : '<button id="login">Войти</button> <button class="small" id="signup">Начать бесплатно ↗</button>') + '</div></header><main id="home"><section class="hero"><div><small>✦ &nbsp;ТВОЁ МЕСТО ДЛЯ СОЗДАНИЯ</small><h1>Каждая идея<br>заслуживает <em>места.</em></h1><p>Собирай всё, что создаёшь: от первого наброска до готовой игры. Замечай свой рост и делись им с миром.</p><button class="primary" id="add">Добавить работу　＋</button><a class="link" href="#gallery">Исследовать галерею ↓</a></div><div class="heroart"><div class="ring"></div><div class="orb">✳</div><div class="float">✳ &nbsp; Сегодня — хороший день<small>чтобы что-нибудь создать</small></div><div class="float second">♨ &nbsp;' + count + ' дней<small>твой творческий ритм</small></div></div></section><section class="stats"><div>✳ <b>' + works.length + '</b><small>работ в галерее</small></div><div>♨ <b>' + count + ' дней</b><small>твоя серия</small></div><div>◈ <b>' + (user ? works.filter(work => work.owner_id === user.id).length : 0) + '</b><small>твоих работ</small></div><span>Каждая работа — часть твоей истории ↗</span></section><section class="section"><small>СЛУЧАЙНАЯ ИСКРА</small><h2>Вдохновение рядом <button id="shuffle">⟳ Другая работа</button></h2><article class="featured clickable" data-work="' + esc(random.id) + '">' + cover(random, 1) + '<div><label>' + cat(random.category_id)[2] + ' ' + cat(random.category_id)[1] + '</label><h3>' + esc(random.title) + '</h3><p>' + esc(random.description) + '</p><small>СОЗДАТЕЛЬ<br><b>' + esc(random.profiles?.display_name) + '</b></small><span class="open-hint">Открыть работу ↗</span></div></article></section><section class="section" id="gallery"><small>ТВОЯ ВСЕЛЕННАЯ</small><h2>Галерея работ</h2><div class="filters">' + cats.map(category => '<button data-filter="' + category[0] + '" class="filter ' + (filter === category[0] ? 'on' : '') + '">' + category[2] + ' ' + category[1] + '</button>').join('') + ' <button id="add2" class="outline">＋ Добавить работу</button></div><div class="grid">' + shown.map((work, index) => '<article class="work clickable" data-work="' + esc(work.id) + '" tabindex="0" role="button" aria-label="Открыть работу ' + esc(work.title) + '">' + cover(work, index) + '<div><small>' + cat(work.category_id)[2] + ' ' + cat(work.category_id)[1] + '　·　' + new Date(work.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + '</small><h3>' + esc(work.title) + '</h3><p>' + esc(work.description) + '</p><footer>◉ &nbsp;' + esc(work.profiles?.display_name || 'Автор') + (work.demo ? '<i>пример</i>' : '') + '</footer></div></article>').join('') + '</div></section><section class="streak"><b>♨</b><div><small>ТВОЙ ТЕМП — ТВОИ ПРАВИЛА</small><h2>Не нужно быть идеальным.<br><em>Просто продолжай.</em></h2><p>Добавь хотя бы одну работу за день — и огонёк останется с тобой.</p></div><aside>ТВОЙ ОГОНЁК<h3>♨ ' + count + ' дней</h3></aside></section><section class="join" id="about"><div><small>НАЧНИ СЕГОДНЯ</small><h2>Твои идеи заслуживают<br>быть <em>увиденными.</em></h2></div><button id="join" class="primary">' + (user ? 'Добавить работу' : 'Создать свой профиль') + ' ↗</button></section></main>' + sideFeed() + '<footer class="bottom"><b>✳ искра.</b><span>Место, где идеи становятся историей.</span></footer>' + (modal ? dialog() : '') + (selectedWorkId ? detailDialog() : '')
  bind()
}

function sideFeed() {
  const recent = feedWorks.map(work => '<button class="activity-work" data-work="' + esc(work.id) + '">' + avatarMarkup(work.profiles, 'activity-avatar') + '<span><b>' + esc(work.profiles?.display_name || 'Автор') + '</b><small>добавил работу</small><strong>' + esc(work.title) + '</strong></span><time>' + new Date(work.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + '</time></button>').join('')
  const events = notifications.map(item => {
    const phrase = item.notification_type === 'work_like' ? 'поставил лайк работе' : item.notification_type === 'work_dislike' ? 'поставил дизлайк работе' : 'ответил на твой комментарий к работе'
    return '<button class="feed-notification ' + (item.is_read ? '' : 'unread') + '" data-notification="' + esc(item.id) + '" data-work-id="' + esc(item.work_id || '') + '"><span class="notification-dot">' + (item.notification_type === 'work_like' ? '♥' : item.notification_type === 'work_dislike' ? '👎' : '↩') + '</span><span><b>' + esc(item.actor_name) + '</b> ' + phrase + ' <strong>«' + esc(item.work_title) + '»</strong><time>' + new Date(item.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</time></span></button>'
  }).join('')
  return '<aside class="activity-feed"><section class="feed-section"><small>СООБЩЕСТВО</small><h3>Новые работы</h3><div class="activity-list">' + (recent || '<p class="feed-empty">Пока никто не добавил работ.</p>') + '</div></section>' + (user ? '<section class="feed-section personal-feed"><small>ТОЛЬКО ДЛЯ ТЕБЯ</small><h3>Уведомления' + (notifications.some(item => !item.is_read) ? '<i>новые</i>' : '') + '</h3><div class="notification-list">' + (events || '<p class="feed-empty">Пока нет новых уведомлений.</p>') + '</div></section>' : '<p class="feed-login">Войди, чтобы получать личные уведомления.</p>') + '</aside>'
}

function syncRealtime() {
  if (!activityChannel) {
    activityChannel = db.channel('iskra-public-work-feed').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'works' }, refreshActivityFeed).subscribe()
  }
  const nextUserId = user?.id || null
  if (notificationChannelUser === nextUserId) return
  if (notificationChannel) db.removeChannel(notificationChannel)
  notificationChannel = null
  notificationChannelUser = nextUserId
  if (nextUserId) {
    notificationChannel = db.channel('iskra-notifications-' + nextUserId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + nextUserId }, () => refreshNotifications(nextUserId))
      .subscribe()
  }
}

async function refreshActivityFeed() {
  const result = await db.from('works').select('*').order('created_at', { ascending: false })
  if (result.error) return
  if (result.data.length) {
    const ownerIds = [...new Set(result.data.map(work => work.owner_id).filter(Boolean))]
    const profileResult = ownerIds.length ? await db.from('profiles').select('id,display_name,username,avatar_url').in('id', ownerIds) : { data: [] }
    const profilesById = new Map((profileResult.data || []).map(item => [item.id, item]))
    works = result.data.map(work => ({ ...work, profiles: profilesById.get(work.owner_id) || { display_name: 'Автор' } }))
  } else works = sample
  feedWorks = works.filter(work => !work.demo).slice(0, 8)
  if (!modal && !selectedWorkId) render()
}

async function refreshNotifications(userId) {
  if (!user || user.id !== userId) return
  const result = await db.from('notifications').select('id,notification_type,actor_name,work_title,is_read,created_at,work_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
  if (result.error) return
  notifications = result.data || []
  if (!modal && !selectedWorkId) render()
}

function dialog() {
  if (modal === 'auth') return '<div class="shade" id="shade"><section class="modal"><button class="close" data-close>×</button><small>ТВОЯ ИСКРА НАЧИНАЕТСЯ ЗДЕСЬ</small><h2>' + (mode === 'signup' ? 'Создай свой профиль' : 'С возвращением') + '</h2><p>Сохраняй работы и отмечай каждый творческий день. Вход — только по нику и паролю.</p><form id="auth"><label>Ник<input name="username" autocomplete="username" minlength="3" maxlength="24" required></label><label>Пароль<input name="password" type="password" autocomplete="' + (mode === 'signup' ? 'new-password' : 'current-password') + '" minlength="6" maxlength="128" required></label>' + (mode === 'signup' ? '<small class="field-hint">Можно использовать буквы, цифры и _. Почта не нужна. Запомни пароль — восстановить его по почте не получится.</small>' : '') + '<button class="primary full">' + (mode === 'signup' ? 'Создать аккаунт' : 'Войти') + '</button><div id="message"></div></form><button id="switch" class="switch">' + (mode === 'signup' ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт') + '</button></section></div>'
  if (modal === 'work') return '<div class="shade" id="shade"><section class="modal"><button class="close" data-close>×</button><small>НОВАЯ ГЛАВА</small><h2>Добавить работу</h2><form id="workform"><label>Название<input name="title" required maxlength="120"></label><label>Раздел<select name="category_id">' + cats.slice(1).map(category => '<option value="' + category[0] + '">' + category[2] + ' ' + category[1] + '</option>').join('') + '</select></label><label>Коротко о работе<textarea name="description" rows="3"></textarea></label><label>Изображения<input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple><small class="field-hint">Можно выбрать несколько изображений — JPG, PNG, WEBP или GIF, до 50 МБ каждое.</small></label><label>Ссылка на проект<input name="project_url" type="url"></label><button class="primary full">Сохранить работу</button><div id="message"></div></form></section></div>'
  return '<div class="shade" id="shade"><section class="modal"><button class="close" data-close>×</button><small>ТВОЯ СТРАНИЦА</small><h2>Настроить профиль</h2><form id="profileform"><label>Имя<input name="display_name" required value="' + esc(profile?.display_name) + '"></label><div class="avatar-editor">' + avatarMarkup(profile, 'profile-avatar') + '</div><label>Аватар<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><small class="field-hint">Загрузи фото или рисунок для профиля.</small></label><label>Имя пользователя<input name="username" value="' + esc(profile?.username) + '"></label><label>О себе<textarea name="bio">' + esc(profile?.bio) + '</textarea></label><button class="primary full">Сохранить профиль</button><div id="message"></div></form><button id="signout">Выйти из аккаунта</button></section></div>'
}

function renderComment(comment, depth = 0) {
  const mine = commentReactions.find(reaction => reaction.comment_id === comment.id)?.reaction || null
  const replies = depth < 5 ? comments.filter(reply => reply.parent_id === comment.id).map(reply => renderComment(reply, depth + 1)).join('') : ''
  const replyForm = replyToId === comment.id ? '<form class="reply-form" data-reply-form data-parent-id="' + esc(comment.id) + '"><div class="commenting-as">' + (user ? 'Пишешь как <b>' + esc(profile?.display_name || 'Автор') + '</b>' : 'Твой случайный ник: <b>' + esc(guestName) + '</b>') + '</div><textarea name="body" rows="2" maxlength="1000" required placeholder="Ответить…"></textarea><button class="primary">Отправить</button></form>' : ''
  const replyButton = depth < 5 ? '<button class="reply-action" data-reply-id="' + esc(comment.id) + '">Ответить</button>' : ''
  return '<article class="comment" style="--comment-depth:' + Math.min(depth, 5) + '"><div class="comment-avatar">' + avatarMarkup({ display_name: comment.author_name, avatar_url: comment.avatar_url }, 'comment-avatar-image') + '</div><div class="comment-content"><b>' + esc(comment.author_name) + '</b><time>' + new Date(comment.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</time><p>' + esc(comment.body) + '</p><div class="comment-actions"><button data-comment-reaction="' + esc(comment.id) + '" data-reaction="like" class="comment-reaction ' + (mine === 'like' ? 'selected' : '') + '">♥ ' + (comment.like_count || 0) + '</button><button data-comment-reaction="' + esc(comment.id) + '" data-reaction="dislike" class="comment-reaction ' + (mine === 'dislike' ? 'selected' : '') + '">👎 ' + (comment.dislike_count || 0) + '</button>' + replyButton + '</div>' + replyForm + '<div class="comment-replies">' + replies + '</div></div></article>'
}

function detailDialog() {
  const work = works.find(item => String(item.id) === String(selectedWorkId))
  if (!work) return ''
  const imageList = workImages.length ? workImages : (work.image_url ? [{ image_url: work.image_url }] : [])
  const activeImage = imageList[imageIndex]?.image_url
  const image = activeImage ? '<img class="detail-image" src="' + esc(activeImage) + '" alt="' + esc(work.title) + ' — изображение ' + (imageIndex + 1) + '">' : cover(work, Math.max(0, works.indexOf(work)), 'detail-art')
  const imageControls = imageList.length > 1 ? '<div class="image-controls"><button id="previousImage" aria-label="Предыдущее изображение">←</button><span>' + (imageIndex + 1) + ' / ' + imageList.length + '</span><button id="nextImage" aria-label="Следующее изображение">→</button></div>' : ''
  const commentList = comments.filter(comment => !comment.parent_id).map(comment => renderComment(comment)).join('')
  const projectUrl = safeUrl(work.project_url)
  return '<div class="detail-shade" id="detailShade"><section class="detail-view" role="dialog" aria-modal="true" aria-label="' + esc(work.title) + '"><button class="detail-close" id="detailClose" aria-label="Закрыть">×</button><div class="detail-artwork">' + image + imageControls + '</div><aside class="detail-panel"><small class="eyebrow">' + cat(work.category_id)[2] + ' ' + cat(work.category_id)[1] + ' · ' + new Date(work.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) + '</small><h2>' + esc(work.title) + '</h2><p class="detail-author">Автор: <b>' + esc(work.profiles?.display_name || 'Автор') + '</b></p>' + (user && work.owner_id === user.id ? '<button id="deleteWork" class="delete-work">Удалить работу</button>' : '') + '<p class="detail-description">' + esc(work.description || 'Автор пока не добавил описание.') + '</p>' + (projectUrl ? '<a class="project-link" href="' + projectUrl + '" target="_blank" rel="noopener noreferrer">Открыть проект ↗</a>' : '') + '<div class="detail-actions"><button class="like-button ' + (myWorkReaction === 'like' ? 'liked' : '') + '" id="workLike" ' + (user && !work.demo ? '' : 'disabled title="Реакции доступны у опубликованных работ"') + '><span>' + (myWorkReaction === 'like' ? '♥' : '♡') + '</span> <b>' + workLikes + '</b> <span>лайков</span></button><button class="dislike-button ' + (myWorkReaction === 'dislike' ? 'selected' : '') + '" id="workDislike" ' + (user && !work.demo ? '' : 'disabled title="Реакции доступны у опубликованных работ"') + '>👎</button></div><div class="comments-heading"><h3>Комментарии</h3><span>' + comments.length + '</span></div><div class="comment-list" id="commentList">' + (commentList || '<p class="empty-comments">Пока нет комментариев. Будь первым!</p>') + '</div><form class="comment-form" id="commentForm"><div class="commenting-as">' + (user ? 'Пишешь как <b>' + esc(profile?.display_name || 'Автор') + '</b>' : 'Твой случайный ник: <b>' + esc(guestName) + '</b>') + '</div><textarea name="body" rows="3" maxlength="1000" required ' + (work.demo ? 'disabled placeholder="У примеров комментарии отключены"' : 'placeholder="Напиши что-нибудь хорошее…"') + '></textarea><button class="primary" ' + (work.demo ? 'disabled' : '') + '>Оставить комментарий</button><div id="detailMessage" class="detail-message">' + esc(detailMessage) + '</div></form></aside></section></div>'
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
  $('#workLike')?.addEventListener('click', () => toggleWorkReaction('like'))
  $('#workDislike')?.addEventListener('click', () => toggleWorkReaction('dislike'))
  document.querySelectorAll('[data-comment-reaction]').forEach(button => button.addEventListener('click', () => toggleCommentReaction(button.dataset.commentReaction, button.dataset.reaction)))
  document.querySelectorAll('[data-reply-id]').forEach(button => button.addEventListener('click', () => { replyToId = replyToId === button.dataset.replyId ? null : button.dataset.replyId; render() }))
  document.querySelectorAll('[data-reply-form]').forEach(form => form.addEventListener('submit', replySubmit))
  document.querySelectorAll('[data-notification]').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.notification, workId = button.dataset.workId
    notifications = notifications.map(item => item.id === id ? { ...item, is_read: true } : item)
    await db.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id)
    if (workId) openWork(workId); else render()
  }))
  $('#deleteWork')?.addEventListener('click', deleteWork)
  $('#previousImage')?.addEventListener('click', () => { imageIndex = (imageIndex - 1 + workImages.length) % workImages.length; render() })
  $('#nextImage')?.addEventListener('click', () => { imageIndex = (imageIndex + 1) % workImages.length; render() })
  $('#commentForm')?.addEventListener('submit', commentSubmit)
  document.addEventListener('keydown', escapeDetail, { once: true })
}

function escapeDetail(event) { if (event.key === 'Escape' && selectedWorkId) closeWork() }
function closeWork() { selectedWorkId = null; comments = []; commentReactions = []; replyToId = null; workImages = []; imageIndex = 0; detailMessage = ''; render() }
function openAuth(nextMode) { mode = nextMode; modal = 'auth'; render() }
function msg(text, bad = false) { const element = $('#message'); if (element) { element.textContent = text; element.className = bad ? 'error' : '' } }

async function openWork(id) {
  selectedWorkId = id; comments = []; commentReactions = []; replyToId = null; workImages = []; imageIndex = 0; workLikes = 0; myWorkReaction = null; detailMessage = ''; render()
  const work = works.find(item => String(item.id) === String(id))
  if (work?.demo) { if (work.image_url) workImages = [{ image_url: work.image_url }]; render(); return }
  const [statsResult, likeResult, commentResult, imagesResult] = await Promise.all([
    db.from('works').select('likes_count').eq('id', id).single(),
    user ? db.from('work_likes').select('reaction').eq('work_id', id).eq('user_id', user.id) : Promise.resolve({ data: [], error: null }),
    db.from('work_comments').select('id,author_id,parent_id,author_name,body,created_at,like_count,dislike_count').eq('work_id', id).order('created_at'),
    db.from('work_images').select('image_url,sort_order').eq('work_id', id).order('sort_order')
  ])
  if (selectedWorkId !== id) return
  if (!statsResult.error) workLikes = statsResult.data.likes_count || 0
  if (!likeResult.error) myWorkReaction = likeResult.data[0]?.reaction || null
  if (!commentResult.error) {
    comments = commentResult.data
    if (comments.length) {
      const commentIds = comments.map(comment => comment.id)
      const authorIds = [...new Set(comments.map(comment => comment.author_id).filter(Boolean))]
      const [reactionResult, authorResult] = await Promise.all([
        user ? db.from('comment_reactions').select('comment_id,reaction').in('comment_id', commentIds).eq('user_id', user.id) : Promise.resolve({ data: [] }),
        authorIds.length ? db.from('profiles').select('id,avatar_url').in('id', authorIds) : Promise.resolve({ data: [] })
      ])
      const avatarById = new Map((authorResult.data || []).map(author => [author.id, author.avatar_url]))
      comments = comments.map(comment => ({ ...comment, avatar_url: avatarById.get(comment.author_id) || null }))
      commentReactions = reactionResult.data || []
    }
  }
  else detailMessage = 'Не удалось загрузить комментарии. Попробуй обновить страницу.'
  if (!imagesResult.error && imagesResult.data.length) workImages = imagesResult.data
  else if (work.image_url) workImages = [{ image_url: work.image_url }]
  render()
}

async function toggleWorkReaction(reaction) {
  if (!user) return openAuth('login')
  const button = reaction === 'like' ? $('#workLike') : $('#workDislike')
  if (button) button.disabled = true
  const result = myWorkReaction === reaction
    ? await db.from('work_likes').delete().eq('work_id', selectedWorkId).eq('user_id', user.id)
    : myWorkReaction
      ? await db.from('work_likes').update({ reaction }).eq('work_id', selectedWorkId).eq('user_id', user.id)
      : await db.from('work_likes').insert({ work_id: selectedWorkId, user_id: user.id, reaction })
  if (result.error) { detailMessage = 'Не удалось сохранить реакцию. Попробуй ещё раз.'; render(); return }
  await openWork(selectedWorkId)
}

async function toggleCommentReaction(commentId, reaction) {
  if (!user) return openAuth('login')
  const current = commentReactions.find(item => item.comment_id === commentId)?.reaction
  const result = current === reaction
    ? await db.from('comment_reactions').delete().eq('comment_id', commentId).eq('user_id', user.id)
    : await db.from('comment_reactions').upsert({ comment_id: commentId, user_id: user.id, reaction }, { onConflict: 'comment_id,user_id' })
  if (result.error) { detailMessage = 'Не удалось сохранить реакцию на комментарий.'; render(); return }
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
  await submitComment(body, null)
}

async function replySubmit(event) {
  event.preventDefault()
  const body = new FormData(event.currentTarget).get('body').trim()
  await submitComment(body, event.currentTarget.dataset.parentId)
}

async function submitComment(body, parentId) {
  const work = works.find(item => String(item.id) === String(selectedWorkId))
  if (work?.demo) { detailMessage = 'Это пример работы — комментарии сохраняются у опубликованных работ.'; render(); return }
  if (!body) return
  const result = await db.from('work_comments').insert({ work_id: selectedWorkId, parent_id: parentId, author_id: user?.id || null, author_name: user ? (profile?.display_name || 'Автор') : guestName, body })
  if (result.error) { detailMessage = 'Не удалось отправить комментарий. Попробуй ещё раз.'; render(); return }
  replyToId = null
  await openWork(selectedWorkId)
}

async function authSubmit(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  const { data, error } = await db.functions.invoke('username-auth', { body: { action: mode, username: String(form.get('username')).trim().toLowerCase(), password: form.get('password') } })
  if (error) {
    let message = 'Не удалось выполнить вход. Попробуй ещё раз.'
    try { const payload = await error.context?.json(); if (payload?.error) message = payload.error } catch {}
    return msg(message, true)
  }
  if (!data?.session?.access_token || !data?.session?.refresh_token) return msg(data?.error || 'Не удалось выполнить вход. Попробуй ещё раз.', true)
  const session = await db.auth.setSession(data.session)
  if (session.error) return msg('Аккаунт создан, но вход не завершился. Попробуй войти ещё раз.', true)
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
  const form = new FormData(event.currentTarget), avatar = form.get('avatar')
  let avatarUrl = profile?.avatar_url || null, uploadedPath = null
  if (avatar?.size) {
    if (avatar.size > 5242880) return msg('Аватар должен быть меньше 5 МБ.', true)
    uploadedPath = user.id + '/avatar-' + crypto.randomUUID() + '-' + avatar.name.replace(/[^\w.-]/g, '_')
    const upload = await db.storage.from('work-media').upload(uploadedPath, avatar)
    if (upload.error) return msg('Не удалось загрузить аватар: ' + upload.error.message, true)
    avatarUrl = db.storage.from('work-media').getPublicUrl(uploadedPath).data.publicUrl
  }
  const { error } = await db.from('profiles').update({ display_name: form.get('display_name'), username: String(form.get('username') || '').trim().toLowerCase() || null, bio: form.get('bio'), avatar_url: avatarUrl }).eq('id', user.id)
  if (error) {
    if (uploadedPath) await db.storage.from('work-media').remove([uploadedPath])
    return msg(error.code === '23505' ? 'Это имя пользователя уже занято.' : error.message, true)
  }
  const previousAvatar = workImageStoragePath(profile?.avatar_url)
  if (uploadedPath && previousAvatar) await db.storage.from('work-media').remove([previousAvatar])
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
    const profileResult = ownerIds.length ? await db.from('profiles').select('id,display_name,username,avatar_url').in('id', ownerIds) : { data: [] }
    const profilesById = new Map((profileResult.data || []).map(item => [item.id, item]))
    works = result.data.map(work => ({ ...work, profiles: profilesById.get(work.owner_id) || { display_name: 'Автор' } }))
  } else if (!result.error && !works.some(work => !work.demo)) works = sample
  feedWorks = works.filter(work => !work.demo).slice(0, 8)
  if (user) {
    const notificationResult = await db.from('notifications').select('id,notification_type,actor_name,work_title,is_read,created_at,work_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
    notifications = notificationResult.data || []
  } else notifications = []
  syncRealtime()
  if (selectedWorkId) await openWork(selectedWorkId)
  else render()
}

db.auth.onAuthStateChange(() => setTimeout(load, 0))
load()







