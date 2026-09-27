<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Megaphone } from 'lucide-vue-next'
import { listUpdates, type PlatformUpdate } from '../api/updates'

const posts = ref<PlatformUpdate[]>([])
const kind = ref('')
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref('')
let requestVersion = 0
const filters = [
  { label: '全部记录', value: '' },
  { label: '更新记录', value: 'update' },
  { label: '公告', value: 'announcement' },
]
const timelineGroups = computed(() => {
  const groups: Array<{ date: string; posts: PlatformUpdate[] }> = []
  for (const post of posts.value) {
    const date = post.event_date.slice(0, 10)
    const last = groups[groups.length - 1]
    if (last?.date === date) last.posts.push(post)
    else groups.push({ date, posts: [post] })
  }
  return groups
})

function dateLabel(date: string) {
  const [year, month, day] = date.slice(0, 10).split('-')
  return `${year}.${month}.${day}`
}

async function load(reset = false) {
  if (loading.value && !reset) return
  const version = ++requestVersion
  if (reset) { page.value = 1; posts.value = [] }
  loading.value = true
  error.value = ''
  try {
    const result = await listUpdates(page.value, kind.value)
    if (version !== requestVersion) return
    const nextPosts = Array.isArray(result.posts) ? result.posts : []
    posts.value = reset ? nextPosts : [...posts.value, ...nextPosts]
    total.value = result.total
  } catch {
    if (version === requestVersion) error.value = '更新记录暂时无法加载，请稍后重试。'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

watch(kind, () => load(true))
onMounted(() => load(true))
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p class="font-mono text-[11px] font-semibold tracking-wider text-blue-700">DORMCHECK / CHANGELOG</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900">更新日志</h1>
      </div>
      <span class="text-xs text-slate-500">{{ total }} 条记录</span>
    </header>

    <section aria-label="更新日志列表" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div class="flex flex-wrap gap-1" aria-label="筛选记录类型">
          <button v-for="item in filters" :key="item.value" type="button" class="rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm" :class="kind === item.value ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'" :aria-pressed="kind === item.value" @click="kind = item.value">{{ item.label }}</button>
        </div>
        <span class="font-mono text-[11px] text-slate-400">{{ String(posts.length).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}</span>
      </div>

      <div v-if="error" class="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert">{{ error }} <button type="button" class="ml-2 font-bold underline" @click="load(true)">重试</button></div>
      <div v-else-if="!loading && posts.length === 0" class="rounded-2xl border border-blue-100 bg-white px-6 py-14 text-center text-sm text-slate-500">暂无记录</div>

      <div v-if="posts.length" class="space-y-8 sm:space-y-10">
        <section v-for="group in timelineGroups" :key="group.date" class="timeline-group">
          <h2 class="mb-4 pl-10 font-mono text-lg font-semibold tracking-tight text-slate-800 sm:mb-5 sm:pl-12 sm:text-xl">
            <time :datetime="group.date">{{ group.date.split('-').join('.') }}</time>
          </h2>
          <ol class="space-y-4 sm:space-y-5">
            <li v-for="post in group.posts" :key="post.id" class="timeline-entry relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-4">
              <span class="timeline-rail relative" aria-hidden="true"><span class="timeline-dot absolute left-1/2 top-5 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[3px] border-blue-500 bg-white ring-4 ring-blue-50 sm:top-6"></span></span>
              <article class="min-w-0 rounded-xl border border-blue-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:rounded-2xl sm:p-5">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold tracking-wide" :class="post.kind === 'announcement' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-100 bg-blue-50 text-blue-700'"><Megaphone v-if="post.kind === 'announcement'" :size="12" />{{ post.kind === 'announcement' ? '公告' : '更新记录' }}</span>
                  <span v-if="post.pinned" class="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">置顶</span>
                  <span class="ml-auto font-mono text-[11px] text-slate-400">{{ dateLabel(post.event_date) }}</span>
                </div>
                <h3 class="mt-3 text-lg font-bold leading-snug text-slate-900 sm:text-xl">{{ post.title }}</h3>
                <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{{ post.body }}</p>
              </article>
            </li>
          </ol>
        </section>
      </div>
      <p v-if="loading && posts.length === 0" class="rounded-2xl border border-blue-100 bg-white px-6 py-12 text-center font-mono text-xs text-slate-400">正在加载发布记录...</p>
    </section>

    <div v-if="posts.length < total" class="text-center"><button type="button" class="rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50" :disabled="loading" @click="page++; load()">{{ loading ? '加载中…' : '查看更多记录' }}</button></div>
  </div>
</template>

<style scoped>
.timeline-rail::before {
  position: absolute;
  top: 0;
  bottom: -1rem;
  left: 50%;
  width: 1px;
  content: '';
  background: #bfdbfe;
}

.timeline-entry:last-child .timeline-rail::before {
  bottom: calc(100% - 1.5rem);
}

@media (min-width: 640px) {
  .timeline-rail::before { bottom: -1.25rem; }
  .timeline-entry:last-child .timeline-rail::before { bottom: calc(100% - 1.75rem); }
}
</style>

