<template>
  <main class="mx-auto max-w-5xl space-y-5">
    <header class="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
      <RouterLink to="/admin/users" class="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900"><ArrowLeft :size="16" />返回学生账号管理</RouterLink>
      <div class="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div><p class="text-sm font-semibold text-rose-700">账号治理</p><h1 class="mt-1 text-2xl font-bold text-slate-900">学生封禁与黑名单</h1></div>
        <span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{{ total }} 条记录</span>
      </div>
    </header>

    <div v-if="!authorized && !loading" class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{{ error || '此页面仅对管理员开放。' }}</div>
    <template v-else-if="authorized">
      <div v-if="error" class="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ error }}</div>
      <section class="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
        <div class="mb-4"><h2 class="font-semibold text-slate-900">新增封禁</h2><p class="mt-1 text-xs text-slate-500">封禁后，该学号无法绑定或执行任务；已有绑定和任务保留。</p></div>
        <form class="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_10rem_minmax(12rem,1.4fr)_auto]" @submit.prevent="submitBan">
          <input v-model.trim="stuId" required maxlength="64" autocomplete="off" placeholder="学生学号" class="min-w-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
          <select v-model.number="durationDays" class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option v-for="option in durations" :key="option.days" :value="option.days">{{ option.label }}</option></select>
          <input v-model.trim="reason" maxlength="500" placeholder="封禁原因（选填）" class="min-w-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
          <button :disabled="saving" class="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{{ saving ? '提交中…' : '封禁学号' }}</button>
        </form>
      </section>

      <section class="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5">
          <div><h2 class="font-semibold text-slate-900">封禁记录</h2></div>
          <form class="flex min-w-0 flex-1 gap-2 sm:max-w-md" @submit.prevent="search"><input v-model.trim="query" placeholder="搜索学号或原因" class="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" /><button :disabled="loading" class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-50">搜索</button></form>
        </div>
        <div v-if="bans.length" class="divide-y divide-slate-100">
          <article v-for="ban in bans" :key="ban.stu_id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><span class="font-semibold text-slate-900">{{ ban.stu_id }}</span><span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="isExpired(ban.expires_at) ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-700'">{{ isExpired(ban.expires_at) ? '已到期' : expiry(ban.expires_at) }}</span></div><p class="mt-1 truncate text-xs text-slate-500" :title="ban.reason">{{ ban.reason || '未填写原因' }}</p></div>
            <button type="button" :disabled="releasingId === ban.stu_id" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50" @click="releaseBan(ban.stu_id)">{{ releasingId === ban.stu_id ? '处理中…' : '解除封禁' }}</button>
          </article>
        </div>
        <p v-else class="p-10 text-center text-sm text-slate-500">{{ loading ? '正在读取封禁记录…' : '暂无匹配的封禁记录' }}</p>
        <footer v-if="total > pageSize" class="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页 · {{ total }} 条记录</span><PaginationControls :page="page" :total-pages="Math.ceil(total / pageSize)" :loading="loading" @change="changePage" /></footer>
      </section>
    </template>
    <div v-else class="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">正在验证管理员身份…</div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import PaginationControls from '../components/PaginationControls.vue'
import { getCurrentUser } from '../api/auth'
import { getAdminStudentBans, banStudentAccount, unbanStudentAccount, type AdminStudentBan } from '../api/admin'
import { useUser } from '../composables/useUser'

const { token } = useUser()
const authorized = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const stuId = ref('')
const durationDays = ref(7)
const reason = ref('')
const query = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const bans = ref<AdminStudentBan[]>([])
const releasingId = ref('')
const durations = [{ days: 1, label: '1 天' }, { days: 7, label: '7 天' }, { days: 30, label: '30 天' }, { days: 90, label: '90 天' }, { days: 365, label: '1 年' }, { days: 0, label: '永久' }]

function messageOf(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err instanceof Error ? err.message : fallback)
}
function isExpired(value?: string | null) { return Boolean(value && new Date(value).getTime() <= Date.now()) }
function expiry(value?: string | null) { return value ? `至 ${new Date(value).toLocaleString()}` : '永久' }

async function initialize() {
  try {
    if (!token.value) throw new Error('请先登录管理员账号。')
    const current = await getCurrentUser(token.value)
    if (current.role !== 0 && current.role !== 3) throw new Error('此页面仅对管理员开放。')
    authorized.value = true
    await loadBans()
  } catch (err) {
    error.value = messageOf(err, '无法验证管理员身份')
  } finally {
    loading.value = false
  }
}

async function loadBans() {
  loading.value = true
  try {
    const result = await getAdminStudentBans({ q: query.value, page: page.value, page_size: pageSize })
    bans.value = result.bans || []
    total.value = result.total
  } catch (err) {
    error.value = messageOf(err, '读取封禁记录失败')
  } finally {
    loading.value = false
  }
}

async function submitBan() {
  if (!stuId.value) return
  saving.value = true
  error.value = ''
  try {
    await banStudentAccount(stuId.value, durationDays.value, reason.value)
    stuId.value = ''
    reason.value = ''
    page.value = 1
    await loadBans()
  } catch (err) {
    error.value = messageOf(err, '封禁学号失败')
  } finally {
    saving.value = false
  }
}

function search() { page.value = 1; void loadBans() }
function changePage(value: number) { page.value = value; void loadBans() }

async function releaseBan(id: string) {
  releasingId.value = id
  error.value = ''
  try {
    await unbanStudentAccount(id)
    await loadBans()
  } catch (err) {
    error.value = messageOf(err, '解除封禁失败')
  } finally {
    releasingId.value = ''
  }
}

onMounted(initialize)
</script>
