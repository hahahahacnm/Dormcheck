<template>
  <section class="mx-auto max-w-7xl space-y-6">
    <header class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">平台管理</p>
      <div class="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">用户管理</h1>
        </div>
        <span class="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">{{ total }} 个用户</span>
      </div>
    </header>

    <div v-if="loading && !authorized" class="rounded-2xl bg-white/90 p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
      正在验证管理员身份…
    </div>
    <div v-else-if="!authorized" class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
      {{ errorMessage || '此页面仅对管理员开放。' }}
    </div>

    <template v-else>
      <div v-if="errorMessage" class="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ errorMessage }}</div>
      <section class="space-y-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div><h2 class="text-lg font-bold text-slate-900">学生账号管理</h2></div>
          <div class="flex items-center gap-2"><span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{{ studentTotal }} 个学生账号</span><RouterLink to="/admin/students/blacklist" class="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"><Ban :size="15" />导入黑名单</RouterLink></div>
        </div>
        <form class="flex flex-wrap gap-2" @submit.prevent="searchStudents">
          <input v-model="studentQuery" type="search" placeholder="搜索学号、姓名、绑定用户名或邮箱" class="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <button class="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="studentLoading">{{ studentLoading ? '读取中…' : '搜索学生' }}</button>
        </form>
        <div v-if="students.length" class="overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full min-w-[1120px] table-fixed text-left text-sm">
            <thead class="bg-slate-50 text-xs font-semibold text-slate-500"><tr>
              <th class="w-[19%] px-4 py-3">学生</th><th class="w-[13%] px-4 py-3">账号状态</th><th class="w-[15%] px-4 py-3">第三方平台密码</th><th class="w-[23%] px-4 py-3">绑定用户</th><th class="w-[17%] px-4 py-3">托管情况 / 最近登录</th><th class="w-[13%] px-4 py-3 text-right">操作</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="student in students" :key="student.stu_id" class="align-middle hover:bg-blue-50/40">
                <td class="px-4 py-3"><p class="truncate font-semibold text-slate-900" :title="student.name">{{ student.name || '未获取姓名' }}</p><p class="mt-0.5 text-[11px] text-slate-500">{{ student.stu_id }}</p></td>
                <td class="px-4 py-3"><span class="inline-flex max-w-full rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="student.student_banned ? 'bg-rose-50 text-rose-700' : student.account_status === 'valid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'">{{ student.student_banned ? `封禁 · ${banExpiry(student.student_ban_expires_at)}` : student.account_status === 'valid' ? '账号正常' : student.account_status === 'locked' ? '登录失败锁定' : '账号异常' }}</span><p v-if="student.student_banned" class="mt-1 line-clamp-1 text-[11px] text-rose-700" :title="student.student_ban_reason">{{ student.student_ban_reason || '未填写原因' }}</p><p v-else-if="student.auth_error" class="mt-1 line-clamp-1 text-[11px] text-amber-800" :title="student.auth_error">{{ student.auth_error }}</p></td>
                <td class="px-4 py-3"><span class="block truncate font-mono text-xs text-slate-700" :title="student.password">{{ student.password || '未保存' }}</span></td>
                <td class="px-4 py-3"><p class="truncate text-xs text-slate-700" :title="student.bound_users.join('、')">{{ student.bound_users.length ? student.bound_users.join('、') : '当前无人绑定' }}</p><p class="mt-0.5 text-[11px] text-slate-400">{{ student.binding_count }} 个绑定用户</p></td>
                <td class="px-4 py-3"><p class="text-xs text-slate-700">{{ student.task_count }} 个托管任务</p><p class="mt-1 text-[11px] text-slate-500">{{ student.last_login && !student.last_login.startsWith('0001-') ? new Date(student.last_login).toLocaleString() : '暂无登录记录' }}</p></td>
                <td class="px-4 py-3"><div class="flex justify-end gap-1.5"><button type="button" class="whitespace-nowrap rounded-lg border border-blue-200 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50" @click="openStudentCredentials(student)">更新</button><button v-if="student.student_banned" type="button" class="whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50" @click="liftStudentBan(student.stu_id)">解封</button><button v-else type="button" class="whitespace-nowrap rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50" @click="openStudentBan(student)">封禁</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">{{ studentLoading ? '正在读取学生账号…' : '没有匹配的学生账号' }}</p>
        <div v-if="studentTotal > studentPageSize" class="flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>第 {{ studentPage }} / {{ Math.ceil(studentTotal / studentPageSize) }} 页 · {{ studentTotal }} 个学生</span><PaginationControls :page="studentPage" :total-pages="Math.ceil(studentTotal / studentPageSize)" :loading="studentLoading" @change="changeStudentPage" /></div>
      </section>

      <form class="flex flex-wrap gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm" @submit.prevent="searchUsers">
        <input
          v-model="query"
          type="search"
          placeholder="按用户名或邮箱搜索"
          class="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button class="rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-800" :disabled="loading">
          搜索
        </button>
        <button type="button" class="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50" :disabled="loading" @click="resetSearch">
          重置
        </button>
      </form>

      <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div class="divide-y divide-blue-50 md:hidden">
          <article v-for="user in users" :key="user.id" class="space-y-3 p-4">
            <div class="min-w-0"><p class="font-bold text-slate-900">{{ user.username }} <span class="text-xs font-normal text-slate-400">#{{ user.id }}</span></p><p class="mt-1 break-all text-xs text-slate-500">{{ user.email }}</p></div>
            <div class="flex flex-wrap items-center gap-2 text-xs"><span class="rounded-full px-2.5 py-1 font-semibold" :class="user.email_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'">{{ user.email_verified ? '邮箱已验证' : '邮箱未验证' }}</span><span v-if="user.banned" class="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">{{ banExpiry(user.ban_expires_at) }}</span><span v-if="user.id === currentUserId" class="text-slate-400">当前账号</span><span v-else-if="currentRole === 0 && user.role === 3" class="text-slate-400">仅超级管理员可修改</span></div>
            <div class="flex flex-wrap gap-2"><select v-model.number="draftRoles[user.id]" :disabled="!canEdit(user) || savingId === user.id" class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:bg-slate-100" :aria-label="`${user.username}的角色`"><option v-for="role in roles" :key="role.value" :value="role.value">{{ role.label }}</option></select><button type="button" :disabled="!canEdit(user) || !isChanged(user) || savingId === user.id" class="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300" @click="saveRole(user)">{{ savingId === user.id ? '保存中…' : '保存角色' }}</button></div>
            <p v-if="user.banned" class="break-words text-xs text-rose-700">{{ user.ban_reason || '未填写封禁原因' }}</p>
            <div class="flex justify-end"><button v-if="user.banned" type="button" :disabled="!canEdit(user) || banningId === user.id" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50" @click="liftUserBan(user)">解除封禁</button><button v-else type="button" :disabled="!canEdit(user) || banningId === user.id" class="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" @click="openUserBan(user)">封禁用户</button></div>
          </article>
          <p v-if="loading" class="p-8 text-center text-sm text-slate-500">正在加载用户…</p>
          <p v-else-if="users.length === 0" class="p-8 text-center text-sm text-slate-500">没有找到用户</p>
        </div>
        <div class="hidden overflow-x-auto md:block">
          <table class="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-5 py-3">用户</th>
                <th class="px-5 py-3">邮箱状态</th>
                <th class="px-5 py-3">角色</th>
                <th class="px-5 py-3">账号状态</th>
                <th class="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="user in users" :key="user.id" class="hover:bg-slate-50/70">
                <td class="whitespace-nowrap px-5 py-4">
                  <div class="font-semibold text-slate-900">{{ user.username }}</div>
                  <div class="mt-0.5 text-slate-500">{{ user.email }} · #{{ user.id }}</div>
                </td>
                <td class="whitespace-nowrap px-5 py-4">
                  <span :class="user.email_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'" class="rounded-full px-2.5 py-1 text-xs font-semibold">
                    {{ user.email_verified ? '已验证' : '未验证' }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-5 py-4">
                  <select
                    v-model.number="draftRoles[user.id]"
                    :disabled="!canEdit(user) || savingId === user.id"
                    class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    :aria-label="`${user.username}的角色`"
                  >
                    <option v-for="role in roles" :key="role.value" :value="role.value">{{ role.label }}</option>
                  </select>
                  <span v-if="user.id === currentUserId" class="ml-2 text-xs text-slate-400">当前账号</span>
                  <span v-else-if="currentRole === 0 && user.role === 3" class="ml-2 text-xs text-slate-400">仅超级管理员可修改</span>
                </td>
                <td class="px-5 py-4">
                  <span :class="user.banned ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'" class="rounded-full px-2.5 py-1 text-xs font-semibold">{{ user.banned ? banExpiry(user.ban_expires_at) : '正常' }}</span>
                  <p v-if="user.banned && user.ban_reason" class="mt-1 max-w-52 break-words text-xs text-slate-500">{{ user.ban_reason }}</p>
                </td>
                <td class="whitespace-nowrap px-5 py-4 text-right">
                  <div class="flex justify-end gap-2">
                    <button :disabled="!canEdit(user) || !isChanged(user) || savingId === user.id" class="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300" @click="saveRole(user)">{{ savingId === user.id ? '保存中…' : '保存角色' }}</button>
                    <button v-if="user.banned" :disabled="!canEdit(user) || banningId === user.id" class="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 disabled:opacity-50" @click="liftUserBan(user)">解除封禁</button>
                    <button v-else :disabled="!canEdit(user) || banningId === user.id" class="rounded-lg border border-rose-200 px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" @click="openUserBan(user)">封禁用户</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!loading && users.length === 0">
                <td colspan="5" class="px-5 py-12 text-center text-slate-500">没有找到用户</td>
              </tr>
              <tr v-if="loading">
                <td colspan="5" class="px-5 py-12 text-center text-slate-500">正在加载用户…</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>第 {{ page }} / {{ Math.max(1, Math.ceil(total / pageSize)) }} 页 · {{ total }} 个用户</span>
          <PaginationControls :page="page" :total-pages="Math.max(1, Math.ceil(total / pageSize))" :loading="loading" @change="changePage" />
        </footer>
      </div>
    </template>

    <Teleport to="body">
    <div v-if="banTarget" class="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-labelledby="ban-user-title" @click.self="banTarget = null">
      <form class="my-auto w-full max-w-md space-y-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:p-6" @submit.prevent="submitUserBan">
        <div><h2 id="ban-user-title" class="text-lg font-bold text-slate-900">封禁用户</h2><p class="mt-1 text-sm text-slate-500">{{ banTarget.username }} · {{ banTarget.email }}</p></div>
        <p v-if="errorMessage" class="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{{ errorMessage }}</p>
        <label class="block text-sm font-medium leading-5 text-slate-700"><span class="mb-2 block">封禁时长</span><select v-model.number="userBanDuration" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option v-for="duration in banDurations" :key="duration.days" :value="duration.days">{{ duration.label }}</option></select></label>
        <label class="block text-sm font-medium leading-5 text-slate-700"><span class="mb-2 block">原因（选填）</span><textarea v-model="userBanReason" maxlength="500" rows="3" class="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5" placeholder="填写封禁原因，用户可在个人中心查看"></textarea></label>
        <p class="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">封禁后用户仍可登录查看状态，绑定和任务不会删除。若学生没有其他正常绑定用户，该学生的任务会暂停执行；共享学生仍有正常绑定时，任务继续运行。</p>
        <div class="flex justify-end gap-2"><button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm" @click="banTarget = null">取消</button><button :disabled="banningId === banTarget.id" class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ banningId === banTarget.id ? '处理中…' : '确认封禁' }}</button></div>
      </form>
    </div>

    <div v-if="studentBanTarget" class="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-labelledby="ban-student-title" @click.self="studentBanTarget = null">
      <form class="my-auto w-full max-w-md space-y-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:p-6" @submit.prevent="confirmStudentBan">
        <div><h2 id="ban-student-title" class="text-lg font-bold text-slate-900">封禁学生账号</h2><p class="mt-1 text-sm text-slate-500">{{ studentBanTarget.name || '学生' }} · {{ studentBanTarget.stu_id }}</p></div>
        <label class="block text-sm font-medium leading-5 text-slate-700"><span class="mb-2 block">封禁时长</span><select v-model.number="studentBanDuration" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option v-for="duration in banDurations" :key="duration.days" :value="duration.days">{{ duration.label }}</option></select></label>
        <label class="block text-sm font-medium leading-5 text-slate-700"><span class="mb-2 block">原因（选填）</span><textarea v-model="studentBanReason" maxlength="500" rows="3" class="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5" placeholder="填写封禁原因，绑定用户会看到"></textarea></label>
        <p class="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">绑定和任务会保留，但该学号的任务会停止执行；解除封禁后按原任务状态恢复。</p>
        <div class="flex justify-end gap-2"><button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm" @click="studentBanTarget = null">取消</button><button :disabled="studentBanSaving" class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ studentBanSaving ? '处理中…' : '确认封禁' }}</button></div>
      </form>
    </div>

    <div v-if="credentialTarget" class="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-labelledby="student-credentials-title" @click.self="credentialTarget = null">
      <form class="my-auto w-full max-w-md space-y-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.18)] sm:p-6" @submit.prevent="saveStudentCredentials">
        <div><h2 id="student-credentials-title" class="text-lg font-bold text-slate-900">更新并验证学生登录信息</h2><p class="mt-1 text-sm text-slate-500">{{ credentialTarget.name || '学生' }} · {{ credentialTarget.stu_id }}</p></div>
        <label class="block text-sm font-medium leading-5 text-slate-700"><span class="mb-2 block">第三方平台密码</span><input v-model="credentialPassword" type="text" autocomplete="off" required maxlength="256" class="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <p class="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">保存前会使用此密码登录第三方平台验证，并刷新该学生唯一的登录状态；验证失败时不会覆盖现有信息。</p>
        <div class="flex justify-end gap-2"><button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm" @click="credentialTarget = null">取消</button><button :disabled="credentialSaving" class="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ credentialSaving ? '验证中…' : '验证并更新' }}</button></div>
      </form>
    </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Ban } from 'lucide-vue-next'
import PaginationControls from '../components/PaginationControls.vue'
import { getCurrentUser } from '../api/auth'
import {
  banAdminUser, banStudentAccount, getAdminStudents, getAdminUsers,
  setAdminUserRole, unbanAdminUser, unbanStudentAccount, updateAdminStudentCredentials,
  type AdminStudent, type AdminUser,
} from '../api/admin'
import { useUser } from '../composables/useUser'

const roles = [
  { value: 1, label: '普通用户' },
  { value: 2, label: '赞助用户' },
  { value: 0, label: '管理员' },
  { value: 3, label: '超级管理员' },
]
const { token } = useUser()
const users = ref<AdminUser[]>([])
const draftRoles = ref<Record<number, number>>({})
const query = ref('')
const page = ref(1)
const pageSize = 50
const total = ref(0)
const currentUserId = ref(0)
const currentRole = ref<number | null>(null)
const loading = ref(true)
const authorized = ref(false)
const savingId = ref(0)
const errorMessage = ref('')
const banDurations = [
  { days: 1, label: '1 天' },
  { days: 7, label: '7 天' },
  { days: 30, label: '30 天' },
  { days: 90, label: '90 天' },
  { days: 365, label: '1 年' },
  { days: 0, label: '永久' },
]
const banTarget = ref<AdminUser | null>(null)
const userBanDuration = ref(7)
const userBanReason = ref('')
const banningId = ref(0)
const studentBanDuration = ref(7)
const studentBanReason = ref('')
const studentBanSaving = ref(false)
const students = ref<AdminStudent[]>([])
const studentQuery = ref('')
const studentPage = ref(1)
const studentPageSize = 25
const studentTotal = ref(0)
const studentLoading = ref(false)
const studentBanTarget = ref<AdminStudent | null>(null)
const credentialTarget = ref<AdminStudent | null>(null)
const credentialPassword = ref('')
const credentialSaving = ref(false)

function banExpiry(expiresAt?: string | null) {
  if (!expiresAt) return '永久封禁'
  const expiry = new Date(expiresAt)
  return expiry.getTime() <= Date.now() ? '已到期' : `封禁至 ${expiry.toLocaleString()}`
}

function getErrorMessage(error: unknown, fallback: string) {
  const responseError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
  return responseError || (error instanceof Error ? error.message : fallback)
}

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getAdminUsers({ q: query.value.trim(), page: page.value, page_size: pageSize })
    users.value = result.users
    total.value = result.total
    draftRoles.value = Object.fromEntries(result.users.map(user => [user.id, user.role]))
    authorized.value = true
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '读取用户列表失败')
    const status = (error as { response?: { status?: number } })?.response?.status
    authorized.value = status !== 401 && status !== 403
  } finally {
    loading.value = false
  }
}

async function initialize() {
  if (!token.value) {
    authorized.value = false
    errorMessage.value = '请先登录管理员账号。'
    loading.value = false
    return
  }
  try {
    const current = await getCurrentUser(token.value)
    currentUserId.value = current.id
    currentRole.value = current.role
    if (current.role !== 0 && current.role !== 3) {
      authorized.value = false
      errorMessage.value = '此页面仅对管理员开放。'
      loading.value = false
      return
    }
    await Promise.all([loadUsers(), loadStudents()])
  } catch (error) {
    authorized.value = false
    errorMessage.value = getErrorMessage(error, '无法验证管理员身份')
    loading.value = false
  }
}

async function loadStudents() {
  studentLoading.value = true
  try {
    const result = await getAdminStudents({ q: studentQuery.value.trim(), page: studentPage.value, page_size: studentPageSize })
    students.value = result.students
    studentTotal.value = result.total
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '读取学生账号列表失败')
  } finally {
    studentLoading.value = false
  }
}

function searchStudents() { studentPage.value = 1; void loadStudents() }
function changeStudentPage(nextPage: number) { studentPage.value = nextPage; void loadStudents() }

function openStudentBan(item: AdminStudent) {
  studentBanTarget.value = item
  studentBanDuration.value = 7
  studentBanReason.value = ''
}

async function confirmStudentBan() {
  const target = studentBanTarget.value
  if (!target) return
  studentBanSaving.value = true
  errorMessage.value = ''
  try {
    await banStudentAccount(target.stu_id, studentBanDuration.value, studentBanReason.value.trim())
    studentBanTarget.value = null
    await loadStudents()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '封禁学生账号失败')
  } finally {
    studentBanSaving.value = false
  }
}

function openStudentCredentials(item: AdminStudent) {
  credentialTarget.value = item
  credentialPassword.value = item.password
}

async function saveStudentCredentials() {
  const target = credentialTarget.value
  if (!target || !credentialPassword.value) return
  credentialSaving.value = true
  errorMessage.value = ''
  try {
    await updateAdminStudentCredentials(target.stu_id, credentialPassword.value)
    credentialTarget.value = null
    credentialPassword.value = ''
    await loadStudents()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '验证或更新学生登录信息失败')
  } finally {
    credentialSaving.value = false
  }
}

function canEdit(user: AdminUser) {
  if (user.id === currentUserId.value) return false
  if (currentRole.value === 0 && user.role === 3) return false
  return currentRole.value === 0 || currentRole.value === 3
}

function isChanged(user: AdminUser) {
  return draftRoles.value[user.id] !== user.role
}

async function saveRole(user: AdminUser) {
  if (!canEdit(user) || !isChanged(user)) return
  savingId.value = user.id
  errorMessage.value = ''
  try {
    const result = await setAdminUserRole(user.id, draftRoles.value[user.id])
    users.value = users.value.map(item => item.id === user.id ? result.user : item)
    draftRoles.value[user.id] = result.user.role
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '更新用户角色失败')
  } finally {
    savingId.value = 0
  }
}

function openUserBan(user: AdminUser) {
  if (!canEdit(user)) return
  errorMessage.value = ''
  banTarget.value = user
  userBanDuration.value = 7
  userBanReason.value = ''
}

async function submitUserBan() {
  const target = banTarget.value
  if (!target || !canEdit(target)) return
  banningId.value = target.id
  errorMessage.value = ''
  try {
    const result = await banAdminUser(target.id, userBanDuration.value, userBanReason.value.trim())
    users.value = users.value.map(item => item.id === target.id ? result.user : item)
    draftRoles.value[target.id] = result.user.role
    banTarget.value = null
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '封禁用户失败')
  } finally {
    banningId.value = 0
  }
}

async function liftUserBan(target: AdminUser) {
  if (!canEdit(target)) return
  banningId.value = target.id
  errorMessage.value = ''
  try {
    await unbanAdminUser(target.id)
    users.value = users.value.map(item => item.id === target.id ? { ...item, banned: false, ban_reason: '', ban_expires_at: null, banned_at: null } : item)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '解除用户封禁失败')
  } finally {
    banningId.value = 0
  }
}

async function liftStudentBan(stuId: string) {
  errorMessage.value = ''
  try {
    await unbanStudentAccount(stuId)
    await loadStudents()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '解除学生账号封禁失败')
  }
}

function searchUsers() {
  page.value = 1
  void loadUsers()
}

function resetSearch() {
  query.value = ''
  searchUsers()
}

function changePage(nextPage: number) {
  page.value = nextPage
  void loadUsers()
}

onMounted(initialize)
</script>
