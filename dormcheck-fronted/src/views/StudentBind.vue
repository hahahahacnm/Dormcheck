<template>
  <div class="mx-auto max-w-6xl space-y-5">
    <section v-if="!token" class="rounded-2xl border border-blue-100 bg-white px-6 py-20 text-center shadow-sm">
      <Users :size="40" class="mx-auto text-blue-300" />
      <h1 class="mt-4 text-xl font-semibold text-slate-900">请先登录</h1>
    </section>

    <template v-else>
      <header class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p class="text-sm font-semibold text-blue-700">学生账号</p>
          <h1 class="mt-1 text-2xl font-bold text-slate-900">学生绑定</h1>
        </div>
        <button type="button" class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700" @click="openBindDialog()">
          <Plus :size="17" />添加绑定
        </button>
      </header>

      <section class="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-blue-50 px-5 py-4 sm:px-6">
          <h2 class="text-base font-semibold text-slate-900">已绑定学生</h2>
          <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{{ studentList.length }} 个账号</span>
        </div>

        <div v-if="studentList.length">
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full min-w-[900px] table-fixed text-left text-sm">
              <thead class="border-b border-blue-50 bg-slate-50 text-xs font-semibold text-slate-500"><tr><th class="w-[22%] px-5 py-3">学生</th><th class="w-[14%] px-4 py-3">账号状态</th><th class="w-[21%] px-4 py-3">保存的密码</th><th class="w-[25%] px-4 py-3">状态说明</th><th class="w-[18%] px-4 py-3 text-right">操作</th></tr></thead>
              <tbody class="divide-y divide-blue-50">
                <tr v-for="stu in studentList" :key="stu.stuId" class="hover:bg-blue-50/30">
                  <td class="px-5 py-3"><p class="truncate font-semibold text-slate-900" :title="stu.name">{{ stu.name || '未命名学生' }}</p><p class="mt-0.5 text-[11px] text-slate-500">{{ stu.stuId }}</p></td>
                  <td class="px-4 py-3"><span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="stu.studentBanned || stu.accountStatus === 'locked' ? 'bg-rose-100 text-rose-800' : stu.accountStatus === 'invalid' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'">{{ studentStatus(stu) }}</span></td>
                  <td class="px-4 py-3"><div class="flex min-w-0 items-center gap-2"><span v-if="stu.cachedPassword !== undefined" class="min-w-0 truncate font-mono text-xs text-slate-700" :title="stu.showPassword ? stu.cachedPassword : ''">{{ stu.showPassword ? stu.cachedPassword : '••••••••' }}</span><button v-if="stu.cachedPassword !== undefined" type="button" class="shrink-0 text-xs font-medium text-blue-700" @click="togglePassword(stu)">{{ stu.showPassword ? '隐藏' : '显示' }}</button><button v-else type="button" class="text-xs font-medium text-blue-700" @click="fetchPassword(stu)">查看密码</button></div></td>
                  <td class="px-4 py-3"><p v-if="stu.studentBanned" class="truncate text-xs text-rose-700" :title="stu.studentBanReason">封禁：{{ stu.studentBanReason || '未填写原因' }} · {{ studentBanExpiry(stu) }}</p><p v-else-if="stu.accountStatus === 'invalid' || stu.accountStatus === 'locked'" class="truncate text-xs text-amber-800" :title="accountStateDescription(stu)">{{ accountStateDescription(stu) }}</p><span v-else class="text-xs text-slate-400">账号正常</span></td>
                  <td class="px-4 py-3"><div class="flex justify-end gap-2"><button type="button" :disabled="stu.studentBanned" :title="stu.studentBanned ? '解除封禁后才能更新学生账号' : ''" class="whitespace-nowrap rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50" @click="openBindDialog(stu.stuId)">{{ stu.accountStatus === 'valid' ? '更新密码' : '更新并验证' }}</button><button type="button" class="whitespace-nowrap rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" @click="unbindStudent(stu.stuId)">解绑</button></div></td>
                </tr>
              </tbody>
            </table>
          </div>

          <ul class="divide-y divide-blue-50 md:hidden">
            <li v-for="stu in studentList" :key="stu.stuId" class="space-y-2.5 px-4 py-3">
              <div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="truncate font-semibold text-slate-900">{{ stu.name || '未命名学生' }} <span class="ml-1 text-[11px] font-normal text-slate-500">{{ stu.stuId }}</span></p><span class="mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="stu.studentBanned || stu.accountStatus === 'locked' ? 'bg-rose-100 text-rose-800' : stu.accountStatus === 'invalid' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'">{{ studentStatus(stu) }}</span></div>
                <div class="flex shrink-0 gap-1.5"><button type="button" :disabled="stu.studentBanned" class="rounded-lg border border-blue-200 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 disabled:opacity-50" @click="openBindDialog(stu.stuId)">{{ stu.accountStatus === 'valid' ? '更新' : '验证' }}</button><button type="button" class="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700" @click="unbindStudent(stu.stuId)">解绑</button></div>
              </div>
              <div class="flex min-w-0 items-center gap-2 text-xs"><span class="shrink-0 text-slate-500">密码</span><span v-if="stu.cachedPassword !== undefined" class="min-w-0 truncate font-mono text-slate-700">{{ stu.showPassword ? stu.cachedPassword : '••••••••' }}</span><button v-if="stu.cachedPassword !== undefined" type="button" class="shrink-0 text-blue-700" @click="togglePassword(stu)">{{ stu.showPassword ? '隐藏' : '显示' }}</button><button v-else type="button" class="text-blue-700" @click="fetchPassword(stu)">查看</button></div>
              <p v-if="stu.studentBanned" class="line-clamp-2 text-[11px] leading-4 text-rose-700">封禁原因：{{ stu.studentBanReason || '管理员未填写原因' }} · {{ studentBanExpiry(stu) }}</p>
              <p v-else-if="stu.accountStatus === 'invalid' || stu.accountStatus === 'locked'" class="line-clamp-2 text-[11px] leading-4 text-amber-800">{{ accountStateDescription(stu) }}</p>
            </li>
          </ul>
        </div>

        <div v-else class="px-6 py-16 text-center">
          <Users :size="40" class="mx-auto text-blue-200" />
          <p class="mt-3 font-semibold text-slate-800">暂无绑定记录</p>
          <button type="button" class="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" @click="openBindDialog()">添加绑定</button>
        </div>
      </section>
    </template>

    <ConfirmDialog ref="confirmDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Users } from 'lucide-vue-next'
import { useUser } from '../composables/useUser'
import { useToast } from '../composables/useToast'
import { student } from '../api/student'
import ConfirmDialog from '../components/ConfirmDialog.vue'

interface BoundStudent {
  stuId: string
  name: string
  accountStatus?: 'valid' | 'invalid' | 'locked'
  authFailedAt?: string | null
  authFailureDays?: number
  authError?: string
  studentBanned?: boolean
  studentBanReason?: string
  studentBanExpiresAt?: string | null
  showPassword?: boolean
  cachedPassword?: string
}

const { token, isLoggedIn } = useUser()
const router = useRouter()
const toast = useToast()
const studentList = ref<BoundStudent[]>([])
const confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)

async function fetchStudentList() {
  if (!token.value) return
  try {
    const res = await student.getBoundStudents()
    studentList.value = res.data.map(s => ({ ...s, showPassword: false, cachedPassword: undefined }))
  } catch (err: any) {
    toast.show(err.message || '获取绑定信息失败', 'error')
  }
}

async function unbindStudent(id: string) {
  if (!token.value) return
  const confirmed = await confirmDialogRef.value?.open('确定解绑该学生账号吗？此操作不可撤销。')
  if (!confirmed) return
  try {
    await student.unbindStudentApi({ stu_id: id })
    toast.show('解绑成功', 'success')
    await fetchStudentList()
  } catch (err: any) {
    toast.show(err.message || '解绑失败', 'error')
  }
}

function togglePassword(stu: BoundStudent) { stu.showPassword = !stu.showPassword }

function studentStatus(stu: BoundStudent) {
  if (stu.studentBanned) return '学生已封禁'
  if (stu.accountStatus === 'locked') return '账号异常 · 已锁定'
  if (stu.accountStatus === 'invalid') return '账号异常'
  return '已绑定'
}

function studentBanExpiry(stu: BoundStudent) {
  return stu.studentBanExpiresAt ? `至 ${new Date(stu.studentBanExpiresAt).toLocaleString()}` : '永久'
}

async function fetchPassword(stu: BoundStudent) {
  if (!token.value) return
  if (stu.cachedPassword !== undefined) { stu.showPassword = true; return }
  try {
    const res = await student.getStudentPassword(stu.stuId)
    if (res.success) {
      stu.cachedPassword = res.data.password
      stu.showPassword = true
    } else {
      toast.show(res.message || '获取密码失败', 'error')
    }
  } catch (err: any) {
    toast.show(err.message || '获取密码失败', 'error')
  }
}

function openBindDialog(stuId?: string) {
  router.push(stuId ? `/student-bind/${encodeURIComponent(stuId)}/edit` : '/student-bind/add')
}

function accountStateDescription(stu: BoundStudent) {
  const reason = stu.authError ? `${stu.authError}。` : ''
  if (stu.accountStatus === 'locked') return `${reason}已停止刷新与全部任务执行；请更新密码并重新验证绑定，验证成功后解锁。`
  return `${reason}连续认证失败 ${stu.authFailureDays || 1}/3 天；第三天锁定任务。请及时更新密码并验证。`
}

watch(isLoggedIn, (val) => {
  if (val) fetchStudentList()
  else studentList.value = []
})

onMounted(() => { if (isLoggedIn.value) fetchStudentList() })
</script>
