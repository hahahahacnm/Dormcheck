<template>
  <div class="mx-auto max-w-7xl space-y-5">
    <section v-if="!token" class="rounded-2xl border border-blue-100 bg-white px-4 py-20 text-center text-slate-500 shadow-sm">
      请先登录后再查看任务
    </section>

    <template v-else>
      <header class="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p class="text-sm font-semibold text-blue-700">{{ isAdmin ? '平台任务' : '我的任务' }}</p>
          <h1 class="mt-1 text-2xl font-bold text-slate-900">任务管理</h1>
        </div>
        <div class="flex shrink-0 gap-2">
          <button class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" :disabled="loading" @click="refreshAll">{{ loading ? '刷新中…' : '刷新' }}</button>
          <button class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800" @click="openAddTask">添加任务</button>
        </div>
      </header>

      <section class="task-stats-grid gap-3">
        <div class="rounded-xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200"><p class="text-xs text-slate-500">任务总数</p><p class="mt-1 text-2xl font-bold text-slate-900">{{ totalCount }}</p></div>
        <div class="rounded-xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200"><p class="text-xs text-slate-500">运行中</p><p class="mt-1 text-2xl font-bold text-emerald-700">{{ runningCount }}</p></div>
        <div class="rounded-xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200"><p class="text-xs text-slate-500">已暂停</p><p class="mt-1 text-2xl font-bold text-slate-700">{{ pausedCount }}</p></div>
        <div class="rounded-xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200"><p class="text-xs text-slate-500">近期失败</p><p class="mt-1 text-2xl font-bold text-rose-700">{{ failureCount }}</p></div>
      </section>

      <section class="rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <div class="task-filter-grid gap-3">
          <label class="relative block">
            <span class="sr-only">搜索任务</span>
            <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Search :size="17" /></span>
            <input v-model="searchQuery" type="search" placeholder="搜索学生、学号、活动或绑定用户" class="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label>
            <span class="sr-only">按活动筛选</span>
            <select v-model="selectedActivityId" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">全部活动</option>
              <option v-for="activity in activityOptions" :key="activity.id" :value="activity.id">{{ activity.name }}（{{ activity.id }}）</option>
            </select>
          </label>
          <label>
            <span class="sr-only">按状态筛选</span>
            <select v-model="selectedStatus" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">全部状态</option>
              <option value="running">运行中</option>
              <option value="paused">已暂停</option>
              <option value="success">已成功</option>
              <option value="failed">最近失败</option>
            </select>
          </label>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>共 {{ filteredTotal }} 条任务</span>
          <button v-if="searchQuery || selectedActivityId || selectedStatus" class="font-medium text-blue-700 hover:text-blue-900" @click="clearFilters">清除筛选</button>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-slate-200">
        <div v-if="loading" class="p-12 text-center text-sm text-slate-500">正在读取任务列表…</div>
        <div v-else-if="pageTasks.length === 0" class="p-12 text-center">
          <p class="font-semibold text-slate-800">{{ totalCount ? '没有符合条件的任务' : '还没有任务' }}</p>
          <button v-if="!totalCount" class="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800" @click="openAddTask">添加任务</button>
        </div>

        <template v-else>
          <div class="task-table-header hidden gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>学生</span><span>活动</span><span>最近执行结果</span><span class="text-right">操作</span>
          </div>
          <div class="divide-y divide-slate-100">
            <article v-for="task in pageTasks" :key="task.ID" class="p-4 sm:p-5">
              <div class="task-row-grid gap-4">
                <div class="min-w-0">
                  <p :title="task.Name || task.StuID" class="truncate font-semibold text-slate-900">{{ task.Name || task.StuID }}</p>
                  <p class="mt-1 text-[11px] text-slate-400">学号 {{ task.StuID }}</p>
                </div>

                <div class="min-w-0">
                  <p :title="task.ActivityName || '未命名活动'" class="break-words text-sm font-medium text-slate-800">{{ task.ActivityName || '未命名活动' }}</p>
                  <p class="mt-1 text-[11px] text-slate-400">ID {{ task.ActivityID }}</p>
                </div>

                <div class="min-w-0 text-sm">
                  <div class="flex flex-wrap items-center gap-2">
                    <span :class="statusClass(task)" class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium">{{ statusText(task) }}</span>
                    <span class="text-xs text-slate-500">重试 {{ task.RetryCount }}/{{ task.MaxRetry }}</span>
                  </div>
                  <p class="mt-1.5 text-xs text-slate-500">最近执行：{{ task.ExecutedAt && !task.ExecutedAt.startsWith('0001-') ? formatDate(task.ExecutedAt) : '暂无记录' }}</p>
                  <p v-if="task.LastError" :title="task.LastError" class="mt-1.5 line-clamp-2 break-words text-xs text-rose-700">{{ task.LastError }}</p>
                  <p v-if="task.StudentBanned" class="mt-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800">
                    <span class="font-semibold">学生账号已封禁，任务暂停执行。</span>
                    <span class="block">原因：{{ task.StudentBanReason || '管理员未填写原因' }}</span>
                    <span class="block">{{ task.StudentBanExpiresAt ? `封禁至 ${formatDate(task.StudentBanExpiresAt)}` : '永久封禁' }}；解除封禁或到期后按原任务状态处理。</span>
                  </p>
                  <p v-else-if="task.ExecutionBlockedReason" class="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{{ task.ExecutionBlockedReason }}</p>
                  <p v-if="task.ActivityIssue" :title="task.ActivityIssue" class="mt-1.5 line-clamp-2 break-words text-xs text-amber-800">
                    {{ task.ActivityOverride ? '已手动恢复，活动仍异常：' : '活动状态：' }}{{ task.ActivityIssue }}
                  </p>
                  <p v-else-if="task.ExecStatus === 'success'" class="mt-1.5 text-xs text-emerald-700">最近一次执行成功</p>
                  <p v-else-if="!task.Enabled" class="mt-1.5 text-xs text-slate-500">自动任务已暂停</p>
                </div>

                <div class="task-row-actions flex flex-wrap gap-2">
                  <button v-if="!task.StudentBanned && !task.ExecutionBlockedReason && isManualWindowOpen(task)" class="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50" :disabled="runningTaskId === task.ID" @click="runNow(task)">{{ runningTaskId === task.ID ? '发送中…' : '手动签到' }}</button>
                  <button class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="Boolean(task.StudentBanned || task.ExecutionBlockedReason) && !task.Enabled" :title="task.StudentBanned ? '学生封禁期间不能恢复任务' : task.ExecutionBlockedReason || ''" @click="toggleTask(task)">{{ task.Enabled ? '暂停' : '恢复' }}</button>
                  <button class="rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50" :aria-label="`查看详情并修改 ${task.Name || task.StuID} 的任务`" @click="openEditTask(task)">详情 / 修改</button>
                  <button class="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50" @click="confirmDelete(task)">删除</button>
                </div>
              </div>
            </article>
          </div>

          <footer class="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>共 {{ filteredTotal }} 条任务</span>
            <PaginationControls :page="currentPage" :total-pages="totalPages" :loading="loading" @change="changePage" />
          </footer>
        </template>
      </section>
    </template>

    <ConfirmDialog ref="confirmRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from 'lucide-vue-next'
import { student, type Task } from '../api/student'
import { deleteAdminTask, getAdminActivityTasks, getAdminTaskList, runAdminTask, toggleAdminTask, type ActivityTaskSummary, type AdminTask } from '../api/admin'
import { useUser } from '../composables/useUser'
import { getCurrentUser } from '../api/auth'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PaginationControls from '../components/PaginationControls.vue'
import { useToast } from '../composables/useToast'

type ViewTask = (Task | AdminTask) & { bound_users?: Array<{ id: number; username: string; email: string }> }
interface ActivityOption { id: string; name: string }

const { token, userRole, setUser } = useUser()
const router = useRouter()
const { show } = useToast()
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const isAdmin = computed(() => userRole.value === 0 || userRole.value === 3)
const allTasks = ref<ViewTask[]>([])
const activityOptions = ref<ActivityOption[]>([])
const activitySummaries = ref<ActivityTaskSummary[]>([])
const totalAdmin = ref(0)
const loading = ref(false)
const searchQuery = ref('')
const selectedActivityId = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const pageSize = 25
const runningTaskId = ref(0)
const clockNow = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined

const filteredUserTasks = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return allTasks.value.filter(task => {
    if (selectedActivityId.value && task.ActivityID !== selectedActivityId.value) return false
    if (selectedStatus.value === 'running' && (task.StudentBanned || task.ExecutionBlockedReason || !task.Enabled || task.ExecStatus === 'success')) return false
    if (selectedStatus.value === 'paused' && task.Enabled && !task.StudentBanned && !task.ExecutionBlockedReason) return false
    if (selectedStatus.value === 'success' && task.ExecStatus !== 'success') return false
    if (selectedStatus.value === 'failed' && task.ExecStatus !== 'failed') return false
    if (query && ![task.Name, task.StuID, task.ActivityName, task.ActivityID, ...(task.bound_users || []).flatMap(user => [user.username, user.email])].some(value => (value || '').toLocaleLowerCase().includes(query))) return false
    return true
  })
})
const pageTasks = computed(() => isAdmin.value ? allTasks.value : filteredUserTasks.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const filteredTotal = computed(() => isAdmin.value ? totalAdmin.value : filteredUserTasks.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTotal.value / pageSize)))
const totalCount = computed(() => isAdmin.value ? activitySummaries.value.reduce((sum, item) => sum + item.task_count, 0) : allTasks.value.length)
const runningCount = computed(() => isAdmin.value ? activitySummaries.value.reduce((sum, item) => sum + item.running_count, 0) : allTasks.value.filter(task => !task.StudentBanned && !task.ExecutionBlockedReason && task.Enabled && task.ExecStatus !== 'success').length)
const pausedCount = computed(() => isAdmin.value ? activitySummaries.value.reduce((sum, item) => sum + item.paused_count, 0) : allTasks.value.filter(task => !task.Enabled || task.StudentBanned || task.ExecutionBlockedReason).length)
const failureCount = computed(() => isAdmin.value ? activitySummaries.value.reduce((sum, item) => sum + item.recent_fail_count, 0) : allTasks.value.filter(task => task.ExecStatus === 'failed').length)

async function refreshAll() {
  if (!token.value) return
  loading.value = true
  try {
    if (isAdmin.value) {
      activitySummaries.value = await getAdminActivityTasks()
      activityOptions.value = activitySummaries.value.map(item => ({ id: item.activity_id, name: item.activity_name || `活动 ${item.activity_id}` }))
      await fetchAdminPage()
    } else {
      const [taskResponse, studentResponse] = await Promise.all([student.getTasks(), student.getBoundStudents()])
      if (!taskResponse.success || !studentResponse.success) throw new Error(taskResponse.message || studentResponse.message || '读取任务失败')
      const students = Array.isArray(studentResponse.data) ? studentResponse.data : []
      const tasks = Array.isArray(taskResponse.data) ? taskResponse.data : []
      const names = new Map(students.map(item => [item.stuId, item.name]))
      allTasks.value = tasks.map(task => ({ ...task, Name: names.get(task.StuID) || task.Name || task.StuID }))
      const options = new Map<string, ActivityOption>()
      allTasks.value.forEach(task => options.set(task.ActivityID, { id: task.ActivityID, name: task.ActivityName || `活动 ${task.ActivityID}` }))
      activityOptions.value = [...options.values()]
      if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
    }
  } catch (error) {
    show(error instanceof Error ? error.message : '读取任务失败', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchAdminPage() {
  const result = await getAdminTaskList({
    q: searchQuery.value.trim(), activity_id: selectedActivityId.value,
    status: selectedStatus.value, page: currentPage.value, page_size: pageSize,
  })
  allTasks.value = result.tasks
  totalAdmin.value = result.total
  const lastPage = Math.max(1, Math.ceil(totalAdmin.value / pageSize))
  if (currentPage.value > lastPage) {
    currentPage.value = lastPage
    await fetchAdminPage()
  }
}

function scheduleAdminFetch() {
  if (!isAdmin.value || !token.value) return
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    loading.value = true
    try { await fetchAdminPage() }
    catch (error) { show(error instanceof Error ? error.message : '筛选任务失败', 'error') }
    finally { loading.value = false }
  }, 250)
}

watch([searchQuery, selectedActivityId, selectedStatus], () => {
  currentPage.value = 1
  if (isAdmin.value) scheduleAdminFetch()
})

async function changePage(page: number) {
  currentPage.value = Math.max(1, Math.min(totalPages.value, page))
  if (isAdmin.value) {
    loading.value = true
    try { await fetchAdminPage() }
    catch (error) { show(error instanceof Error ? error.message : '读取任务失败', 'error') }
    finally { loading.value = false }
  }
}

function clearFilters() { searchQuery.value = ''; selectedActivityId.value = ''; selectedStatus.value = '' }
function openAddTask() { router.push('/tasks/new') }
function openEditTask(task: ViewTask) {
  router.push({ path: `/tasks/edit/${task.ID}`, query: { activity_id: task.ActivityID } })
}

async function runNow(task: ViewTask) {
  runningTaskId.value = task.ID
  try {
    const updated = isAdmin.value ? await runAdminTask(task.ID) : (await student.runTaskNow(task.ID)).data
    const succeeded = updated.LastManualStatus === 'success'
    show(succeeded ? '签到成功' : `本次发送完成：${updated.LastManualError || '签到失败'}`, succeeded ? 'success' : 'error')
    await refreshAll()
  } catch (error) { show(error instanceof Error ? error.message : '手动签到失败', 'error') }
  finally { runningTaskId.value = 0 }
}

async function toggleTask(task: ViewTask) {
  try {
    if (isAdmin.value) await toggleAdminTask(task.ID, !task.Enabled)
    else await student.toggleTask(task.ID, !task.Enabled)
    show(task.Enabled ? '任务已暂停' : '任务已恢复', 'success')
    await refreshAll()
  } catch (error) { show(error instanceof Error ? error.message : '更新任务失败', 'error') }
}

async function confirmDelete(task: ViewTask) {
  if (!confirmRef.value) return
  const prompt = `确定删除「${task.Name || task.StuID}」在「${task.ActivityName}」中的任务吗？此任务由绑定该学生的用户共享。`
  if (!await confirmRef.value.open(prompt)) return
  try {
    const result = isAdmin.value ? await deleteAdminTask(task.ID) : await student.deleteTask(task.ID)
    if ('success' in result && !result.success) throw new Error(result.message)
    show('任务已删除', 'success')
    await refreshAll()
  } catch (error) { show(error instanceof Error ? error.message : '删除失败', 'error') }
}

function statusText(task: ViewTask) {
  if (task.StudentBanned) return '学生已封禁 · 暂停执行'
  if (task.ExecutionBlockedReason) return '执行受限 · 已暂停'
  if (!task.Enabled) return '已暂停'
  if (task.ExecStatus === 'success') return '已成功'
  if (task.ExecStatus === 'failed') return '最近失败'
  return '等待执行'
}
function statusClass(task: ViewTask) {
  if (task.StudentBanned) return 'bg-rose-100 text-rose-800'
  if (task.ExecutionBlockedReason) return 'bg-amber-100 text-amber-900'
  if (!task.Enabled) return 'bg-slate-100 text-slate-700'
  if (task.ExecStatus === 'success') return 'bg-emerald-100 text-emerald-700'
  if (task.ExecStatus === 'failed') return 'bg-rose-100 text-rose-700'
  return 'bg-amber-100 text-amber-800'
}
function formatDate(value: string) { return new Date(value).toLocaleString() }

function isManualWindowOpen(task: ViewTask) {
  const clocks = task.ActivityTimeRange?.match(/\d{1,2}:\d{2}/g) || []
  const scheduledClock = task.SignTime?.match(/\d{1,2}:\d{2}/)?.[0]
  if (clocks.length < 2 || !scheduledClock) return false
  const [startHour, startMinute] = scheduledClock.split(':').map(Number)
  const [endHour, endMinute] = clocks[1].split(':').map(Number)
  if ([startHour, startMinute, endHour, endMinute].some(value => !Number.isFinite(value))) return false
  const now = new Date(clockNow.value)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (const dayOffset of [0, -1]) {
    const day = new Date(today)
    day.setDate(day.getDate() + dayOffset)
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startHour, startMinute)
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), endHour, endMinute)
    if (end <= start) end.setDate(end.getDate() + 1)
    const scheduledDay = localDateKey(start)
    const activityStart = task.ActivityStartDate?.slice(0, 10)
    const activityEnd = task.ActivityEndDate?.slice(0, 10)
    if (activityStart && scheduledDay < activityStart) continue
    if (activityEnd && scheduledDay > activityEnd) continue
    if (now >= start && now <= end) return true
  }
  return false
}
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

onMounted(async () => {
  clockTimer = setInterval(() => { clockNow.value = Date.now() }, 10_000)
  if (!token.value) return
  try {
    if (userRole.value === null) {
      const currentUser = await getCurrentUser(token.value)
      setUser(token.value, currentUser.username, currentUser.email, currentUser.role)
    }
    await refreshAll()
  } catch (error) { show(error instanceof Error ? error.message : '读取用户信息失败', 'error') }
})
onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style scoped>
.task-stats-grid,
.task-filter-grid,
.task-row-grid {
  display: grid;
  min-width: 0;
}

.task-stats-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.task-filter-grid,
.task-row-grid {
  grid-template-columns: minmax(0, 1fr);
}

.task-row-actions {
  align-content: start;
}

@media (min-width: 680px) {
  .task-filter-grid {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  }

  .task-filter-grid > :first-child {
    grid-column: 1 / -1;
  }
}

@media (min-width: 900px) {
  .task-stats-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .task-filter-grid {
    grid-template-columns: minmax(0, 1.5fr) minmax(220px, 1fr) minmax(180px, 0.8fr);
  }

  .task-filter-grid > :first-child {
    grid-column: auto;
  }

  .task-table-header {
    display: grid;
    grid-template-columns: minmax(130px, 0.8fr) minmax(200px, 1.2fr) minmax(280px, 1.6fr);
  }

  .task-table-header > :last-child {
    display: none;
  }

  .task-row-grid {
    grid-template-columns: minmax(130px, 0.8fr) minmax(200px, 1.2fr) minmax(280px, 1.6fr);
    align-items: start;
  }

  .task-row-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
    border-top: 1px solid rgb(241 245 249);
    padding-top: 0.75rem;
  }
}

@media (min-width: 1280px) {
  .task-table-header,
  .task-row-grid {
    grid-template-columns: minmax(140px, 0.8fr) minmax(220px, 1.2fr) minmax(300px, 1.6fr) minmax(250px, auto);
  }

  .task-row-actions {
    grid-column: auto;
    justify-content: flex-end;
    border-top: 0;
    padding-top: 0;
  }

  .task-table-header > :last-child {
    display: block;
    text-align: right;
  }
}
</style>
