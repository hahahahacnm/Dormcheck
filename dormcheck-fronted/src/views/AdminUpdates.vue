<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { RouterLink } from 'vue-router'
import { NotebookPen, Plus, Save, Trash2 } from 'lucide-vue-next'
import PaginationControls from '../components/PaginationControls.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { createUpdate, deleteUpdate, listAdminUpdates, saveUpdate, type PlatformUpdate, type UpdatePayload } from '../api/updates'
import { useUser } from '../composables/useUser'

const { userRole } = useUser()
const allowed = computed(() => userRole.value === 0 || userRole.value === 3)
function changePage(nextPage: number) {
  page.value = nextPage
  void load()
}
const posts = ref<PlatformUpdate[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const editingId = ref<number | null>(null)
const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null)

function today() { return new Date().toLocaleDateString('sv-SE') }
function emptyForm(): UpdatePayload {
  return { kind: 'update', title: '', body: '', event_date: today(), pinned: false, published: false }
}
const form = reactive<UpdatePayload>(emptyForm())

function messageOf(err: unknown) {
  if (axios.isAxiosError(err)) return err.response?.data?.error || '操作失败，请稍后重试。'
  return '操作失败，请稍后重试。'
}

async function load() {
  if (!allowed.value) return
  loading.value = true
  error.value = ''
  try {
    const result = await listAdminUpdates(page.value)
    posts.value = result.posts
    total.value = result.total
  } catch (err) { error.value = messageOf(err) }
  finally { loading.value = false }
}

function resetForm() {
  editingId.value = null
  Object.assign(form, emptyForm())
}

function edit(post: PlatformUpdate) {
  editingId.value = post.id
  Object.assign(form, {
    kind: post.kind, title: post.title, body: post.body, event_date: post.event_date.slice(0, 10),
    pinned: post.pinned, published: post.published,
  })
  document.getElementById('update-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function submit() {
  if (!form.title.trim() || !form.body.trim() || !form.event_date) { error.value = '请填写日期、标题和正文。'; return }
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    if (editingId.value) await saveUpdate(editingId.value, { ...form })
    else await createUpdate({ ...form })
    notice.value = form.published ? '记录已发布，用户可以在更新日志中查看。' : '草稿已保存。'
    resetForm()
    page.value = 1
    await load()
  } catch (err) { error.value = messageOf(err) }
  finally { saving.value = false }
}

async function remove(post: PlatformUpdate) {
  if (!await confirmDialog.value?.open(`确定删除“${post.title}”吗？删除后无法恢复。`)) return
  error.value = ''
  notice.value = ''
  try {
    await deleteUpdate(post.id)
    notice.value = '记录已删除。'
    if (editingId.value === post.id) resetForm()
    if (posts.value.length === 1 && page.value > 1) page.value--
    await load()
  } catch (err) { error.value = messageOf(err) }
}

watch(allowed, canManage => { if (canManage) load() }, { immediate: true })
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <ConfirmDialog ref="confirmDialog" />
    <div v-if="!allowed" class="rounded-2xl border border-blue-100 bg-white p-8 text-center text-slate-600">只有管理员可以管理更新记录。</div>
    <template v-else>
      <header class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:flex sm:items-center sm:justify-between">
        <div><p class="text-xs font-bold tracking-widest text-blue-600">内容发布</p><h1 class="mt-2 text-2xl font-bold text-slate-900">更新记录与公告</h1></div>
        <RouterLink to="/updates" class="mt-4 inline-flex rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 sm:mt-0">查看用户页面</RouterLink>
      </header>

      <p v-if="error" class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{{ error }}</p>
      <p v-if="notice" class="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">{{ notice }}</p>

      <section id="update-editor" class="scroll-mt-24 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
        <div class="mb-6 flex items-center justify-between gap-3"><div class="flex items-center gap-2"><NotebookPen :size="20" class="text-blue-600" /><h2 class="text-lg font-bold text-slate-900">{{ editingId ? '编辑记录' : '写一条新记录' }}</h2></div><button v-if="editingId" type="button" class="text-sm font-semibold text-blue-700 hover:underline" @click="resetForm">取消编辑</button></div>
        <form class="space-y-5" @submit.prevent="submit">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block text-sm font-semibold text-slate-700">记录日期<input v-model="form.event_date" type="date" required class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500" /></label>
            <label class="block text-sm font-semibold text-slate-700">类型<select v-model="form.kind" class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500"><option value="update">更新记录</option><option value="announcement">公告</option></select></label>
          </div>
          <label class="block text-sm font-semibold text-slate-700">标题<input v-model="form.title" type="text" required maxlength="120" placeholder="记录标题" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500" /></label>
          <label class="block text-sm font-semibold text-slate-700">正文<textarea v-model="form.body" required maxlength="20000" rows="7" placeholder="记录内容" class="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 font-normal leading-7 outline-none focus:border-blue-500"></textarea></label>
          <div class="flex flex-wrap gap-x-7 gap-y-3 rounded-xl bg-blue-50/70 px-4 py-3 text-sm text-slate-700"><label class="flex cursor-pointer items-center gap-2"><input v-model="form.pinned" type="checkbox" class="accent-blue-600" />置顶展示</label><label class="flex cursor-pointer items-center gap-2"><input v-model="form.published" type="checkbox" class="accent-blue-600" />立即公开发布</label></div>
          <div class="flex items-center gap-3"><button type="submit" :disabled="saving" class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Save v-if="editingId" :size="17" /><Plus v-else :size="17" />{{ saving ? '保存中…' : editingId ? '保存修改' : '保存记录' }}</button><span class="text-xs text-slate-400">{{ form.published ? '保存后立即对用户可见' : '当前为草稿，仅管理员可见' }}</span></div>
        </form>
      </section>

      <section class="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div class="border-b border-blue-50 px-5 py-4 sm:px-7"><h2 class="font-bold text-slate-900">全部记录 <span class="ml-1 text-sm font-normal text-slate-400">{{ total }} 条</span></h2></div>
        <div v-if="loading" class="p-8 text-center text-sm text-slate-400">加载中…</div>
        <div v-else-if="posts.length === 0" class="p-8 text-center text-sm text-slate-500">还没有记录，写下第一篇平台日记吧。</div>
        <div v-for="post in posts" :key="post.id" class="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:px-7">
          <div class="min-w-0"><div class="flex flex-wrap items-center gap-2 text-xs text-slate-500"><time :datetime="post.event_date.slice(0, 10)">{{ post.event_date.slice(0, 10) }}</time><span class="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{{ post.kind === 'announcement' ? '公告' : '更新' }}</span><span class="rounded-full px-2 py-0.5" :class="post.published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'">{{ post.published ? '已发布' : '草稿' }}</span><span v-if="post.pinned" class="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">置顶</span></div><h3 class="mt-2 font-bold text-slate-900">{{ post.title }}</h3><p class="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{{ post.body }}</p></div>
          <div class="flex shrink-0 gap-2"><button type="button" class="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50" @click="edit(post)">编辑</button><button type="button" class="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50" @click="remove(post)"><Trash2 :size="14" />删除</button></div>
        </div>
        <div v-if="total > 10" class="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-7"><span>第 {{ page }} / {{ Math.ceil(total / 10) }} 页 · {{ total }} 条记录</span><PaginationControls :page="page" :total-pages="Math.ceil(total / 10)" :loading="loading" @change="changePage" /></div>
      </section>
    </template>
  </div>
</template>
