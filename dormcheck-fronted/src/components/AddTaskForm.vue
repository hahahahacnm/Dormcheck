<template>
  <div :class="pageMode ? 'mx-auto max-w-5xl' : 'fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4'" :role="pageMode ? undefined : 'dialog'" :aria-modal="pageMode ? undefined : 'true'" aria-labelledby="modal-title">
    <div :class="pageMode ? 'overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm' : 'flex max-h-[96dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[92dvh] sm:max-w-4xl sm:rounded-2xl'">
      <header class="flex items-center justify-between border-b border-blue-100 bg-white px-4 py-4 sm:px-6">
        <div>
          <h2 id="modal-title" class="text-lg font-semibold text-slate-900 sm:text-xl">{{ formTitle }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ editTask ? '查看运行信息并修改签到地点或通知邮箱。修改会同步给绑定用户，不会重置今日执行结果和自动重试次数。' : '同一学生的同一活动共用一条任务记录。' }}</p>
        </div>
        <button
          @click="$emit('close')"
          type="button"
          :aria-label="pageMode ? '返回任务列表' : '关闭弹窗'"
          class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
        >
          <ArrowLeft :size="18" /><span class="hidden sm:inline">返回</span>
        </button>
      </header>

      <div :class="pageMode ? 'px-4 py-5 sm:px-6 sm:py-6' : 'flex-1 overflow-auto px-4 py-5 sm:px-6 sm:py-6'">
        <form @submit.prevent="onSubmit" class="space-y-6">
          <section v-if="editTask" class="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-blue-700">任务详情</p>
                <h3 class="mt-1 text-base font-semibold text-slate-900">{{ editTask.Name || editTask.StuID }} · {{ editTask.ActivityName || `活动 ${editTask.ActivityID}` }}</h3>
              </div>
              <span :class="detailStatusClass" class="rounded-full px-3 py-1 text-xs font-semibold">{{ detailStatusText }}</span>
            </div>
            <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <div class="rounded-lg bg-white p-3"><dt class="text-xs text-slate-500">学生账号</dt><dd class="mt-1 break-all text-sm font-medium text-slate-800">{{ editTask.StuID }}</dd></div>
              <div class="rounded-lg bg-white p-3"><dt class="text-xs text-slate-500">活动编号</dt><dd class="mt-1 text-sm font-medium text-slate-800">{{ editTask.ActivityID }}</dd></div>
              <div class="rounded-lg bg-white p-3"><dt class="text-xs text-slate-500">活动签到时段</dt><dd class="mt-1 text-sm font-medium text-slate-800">{{ editTask.ActivityTimeRange || '未记录' }}</dd></div>
              <div class="rounded-lg bg-white p-3"><dt class="text-xs text-slate-500">计划执行时间</dt><dd class="mt-1 text-sm font-medium text-slate-800">{{ formatClock(editTask.SignTime) }}</dd></div>
              <div class="rounded-lg bg-white p-3"><dt class="text-xs text-slate-500">活动有效期</dt><dd class="mt-1 text-sm font-medium text-slate-800">{{ shortDate(editTask.ActivityStartDate) }} 至 {{ shortDate(editTask.ActivityEndDate) }}</dd></div>
              <div class="rounded-lg bg-white p-3"><dt class="text-xs text-slate-500">自动任务</dt><dd class="mt-1 text-sm font-medium text-slate-800">{{ editTask.Enabled ? '已开启' : '已暂停' }}</dd></div>
              <div class="rounded-lg bg-white p-3"><dt class="text-xs text-slate-500">自动重试</dt><dd class="mt-1 text-sm font-medium text-slate-800">{{ editTask.RetryCount ?? 0 }} / {{ editTask.MaxRetry ?? 0 }}</dd></div>
              <div class="rounded-lg bg-white p-3"><dt class="text-xs text-slate-500">最近执行</dt><dd class="mt-1 text-sm font-medium text-slate-800">{{ formatAttempt(editTask.ExecutedAt) }}</dd></div>
              <div class="col-span-2 rounded-lg bg-white p-3 sm:col-span-3 lg:col-span-4">
                <dt class="text-xs text-slate-500">归属用户</dt>
                <dd v-if="!adminMode" class="mt-1 text-sm font-medium text-slate-800">当前账号</dd>
                <dd v-else-if="editTask.bound_users?.length" class="mt-2 flex flex-wrap gap-2">
                  <span v-for="user in editTask.bound_users" :key="user.id" class="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{{ user.username }} · {{ user.email }}</span>
                </dd>
                <dd v-else class="mt-1 text-sm font-medium text-slate-800">暂无绑定用户</dd>
              </div>
              <div v-if="editTask.ActivityIssue" class="col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:col-span-3 lg:col-span-4">
                <dt class="text-xs font-semibold text-amber-800">活动状态异常</dt>
                <dd class="mt-1 break-words text-sm text-amber-900">{{ editTask.ActivityIssue }}</dd>
                <dd class="mt-1 text-xs text-amber-800">{{ editTask.ActivityOverride ? '此任务已手动恢复，活动状态仍需留意。' : '活动恢复正常后，系统会自动恢复此前运行中的任务。' }}</dd>
              </div>
            </dl>
            <div class="mt-3 rounded-lg bg-white p-3">
              <p class="text-xs text-slate-500">最近自动执行结果</p>
              <p :class="editTask.LastError ? 'text-rose-700' : editTask.ExecStatus === 'success' ? 'text-emerald-700' : 'text-slate-600'" class="mt-1 break-words text-sm font-medium">
                {{ editTask.LastError || (editTask.ExecStatus === 'success' ? '最近一次执行成功' : editTask.ExecStatus === 'failed' ? '执行失败，暂无错误说明' : '尚无执行结果') }}
              </p>
            </div>
            <div v-if="editTask.LastManualAt" class="mt-3 rounded-lg bg-white p-3">
              <p class="text-xs text-slate-500">最近手动执行 · {{ formatAttempt(editTask.LastManualAt) }}</p>
              <p :class="editTask.LastManualStatus === 'success' ? 'text-emerald-700' : 'text-rose-700'" class="mt-1 break-words text-sm font-medium">
                {{ editTask.LastManualStatus === 'success' ? '签到成功' : editTask.LastManualError || '签到失败' }}
              </p>
            </div>
          </section>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700" for="stu_id">学生账号</label>
              <select
                id="stu_id"
                v-model="form.stu_id"
                :disabled="!!editTask"
                class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                @change="onStudentChange(form.stu_id, true)"
                required
              >
                <option value="" disabled>请选择学生账号</option>
                <option v-for="stu in studentList" :key="stu.stuId" :value="stu.stuId">
                  {{ stu.stuId }}（{{ stu.name }}）
                </option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700" for="activity_id">签到活动</label>
              <select
                id="activity_id"
                v-model="form.activity_id"
                class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                :disabled="!form.stu_id || loadingActivities || !!editTask"
                required
              >
                <option v-if="editTask" :value="form.activity_id">
                  {{ editTask.ActivityName || `活动 ${form.activity_id}` }}（ID {{ form.activity_id }}）
                </option>
                <option v-else value="" disabled>{{ loadingActivities ? '活动加载中...' : '请选择活动' }}</option>
                <option v-for="act in activityList" :key="act.id" :value="act.id">
                  {{ act.name }}
                </option>
              </select>
            </div>
          </div>

          <section class="space-y-3 rounded-xl border border-slate-200 p-4 sm:p-5">
            <div>
              <h3 class="font-semibold text-slate-900">签到地点</h3>
              <p class="mt-1 text-xs text-slate-500">{{ editTask ? '修改地图位置后，新的地址和坐标会保存到此共享任务。' : '选择平台要求的签到位置。' }}</p>
            </div>
            <MapContainer :initial-location="initialLocation" @update="onMapUpdate" />
          </section>

          <p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">系统会根据活动开始时间自动安排执行（开始后约 5 分钟），并由平台统一管理重试。</p>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="notify_email">通知邮箱</label>
            <input
              id="notify_email"
              v-model="form.notify_email"
              type="email"
              placeholder="可选，用于接收签到结果"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div class="sticky bottom-0 -mx-4 border-t border-blue-100 bg-white px-4 py-4 sm:-mx-6 sm:px-6">
            <button
              type="submit"
              :disabled="loading"
              class="w-full rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {{ loading ? '提交中...' : submitText }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { student, type Activity } from '../api/student'
import { updateAdminTask } from '../api/admin'
import { useUser } from '../composables/useUser'
import { useToast } from '../composables/useToast'
import MapContainer from './MapContainer.vue'

interface EditableTask {
  ID: number
  StuID: string
  Name: string
  ActivityID: string
  ActivityName: string
  ActivityCollege?: string
  SignMode?: string
  ActivityTimeRange?: string
  ActivityStartDate?: string
  ActivityEndDate?: string
  SignType?: number
  QRCodeType?: number
  Address: string
  Longitude: number
  Latitude: number
  SignTime: string
  Enabled?: boolean
  ExecStatus?: string
  RetryCount?: number
  MaxRetry?: number
  LastError?: string
  ExecutedAt?: string
  LastManualAt?: string | null
  LastManualStatus?: string
  LastManualError?: string
  ActivityIssue?: string
  ActivityOverride?: boolean
  NotifyEmail?: string
  bound_users?: Array<{ id: number; username: string; email: string }>
}

const props = defineProps<{
  pageMode?: boolean
  editTask?: EditableTask | null
  adminMode?: boolean
}>()

const emit = defineEmits(['close', 'task-added'])
const { token } = useUser()
const { show } = useToast()

const form = reactive({
  stu_id: props.editTask?.StuID || '',
  activity_id: props.editTask?.ActivityID || '',
  address: props.editTask?.Address || '',
  longitude: props.editTask?.Longitude || 0,
  latitude: props.editTask?.Latitude || 0,
  notify_email: props.editTask?.NotifyEmail || '',
})

const studentList = ref<{ stuId: string; name: string }[]>([])
const activityList = ref<Activity[]>([])
const loading = ref(false)
const loadingActivities = ref(false)
const formTitle = computed(() => (props.editTask ? '任务详情 / 修改' : '添加签到任务'))
const submitText = computed(() => (props.editTask ? '保存修改' : '提交任务'))
const detailStatusText = computed(() => {
  if (!props.editTask) return ''
  if (!props.editTask.Enabled) return '已暂停'
  if (props.editTask.ExecStatus === 'success') return '执行成功'
  if (props.editTask.ExecStatus === 'failed') return '最近失败'
  return '等待执行'
})
const detailStatusClass = computed(() => {
  if (!props.editTask?.Enabled) return 'bg-slate-200 text-slate-700'
  if (props.editTask.ExecStatus === 'success') return 'bg-emerald-100 text-emerald-800'
  if (props.editTask.ExecStatus === 'failed') return 'bg-rose-100 text-rose-800'
  return 'bg-amber-100 text-amber-800'
})
const initialLocation = computed(() => ({
  lng: form.longitude,
  lat: form.latitude,
  address: form.address,
}))

onMounted(async () => {
  await fetchStudentList()
  if (props.editTask && !studentList.value.some(item => item.stuId === props.editTask?.StuID)) {
    studentList.value.unshift({ stuId: props.editTask.StuID, name: props.editTask.Name || props.editTask.StuID })
  }
  if (form.stu_id && !(props.adminMode && props.editTask)) {
    await onStudentChange(form.stu_id, false)
  }
})

async function fetchStudentList() {
  if (!token.value) return
  try {
    const res = await student.getBoundStudents()
    if (res.success) studentList.value = res.data || []
  } catch {
    show('获取绑定学生失败', 'error')
  }
}

async function onStudentChange(stu_id: string, resetActivity = false) {
  if (!token.value) return
  if (resetActivity) {
    form.activity_id = ''
  }
  loadingActivities.value = true
  try {
    const res = await student.getActivities(token.value, stu_id)
    if (res.success) {
      activityList.value = res.data || []
      if (props.editTask && form.activity_id && !activityList.value.some(a => String(a.id) === String(form.activity_id))) {
        activityList.value.unshift({ id: form.activity_id, name: props.editTask.ActivityName })
      }
    }
  } catch {
    show('获取活动失败', 'error')
  } finally {
    loadingActivities.value = false
  }
}

async function onSubmit() {
  if (!token.value) {
    show('请先登录', 'error')
    return
  }

  if (!form.stu_id || !form.activity_id || !form.address || form.longitude === 0 || form.latitude === 0) {
    show('请补全任务信息', 'error')
    return
  }

  if (form.notify_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.notify_email)) {
    show('请输入有效的邮箱地址', 'error')
    return
  }

  const selectedStudent = studentList.value.find(s => s.stuId === form.stu_id)
const selectedActivity = activityList.value.find(a => String(a.id) === String(form.activity_id))
  const studentName = selectedStudent?.name || props.editTask?.Name || ''
  const activityName = selectedActivity?.name || props.editTask?.ActivityName || ''

  loading.value = true
  try {
    const payload = {
      ...form,
      activity_id: String(form.activity_id),
      name: studentName,
      activity_name: activityName,
      activity_college: selectedActivity?.collegeview || props.editTask?.ActivityCollege || '',
      sign_mode: selectedActivity
        ? describeSignMode(selectedActivity.sigintype, selectedActivity.qrcodetype)
        : props.editTask?.SignMode || '',
      activity_time_range: selectedActivity
        ? getActivityTimeRange(selectedActivity)
        : props.editTask?.ActivityTimeRange || '',
      activity_start_date: selectedActivity?.foreachp_startday || props.editTask?.ActivityStartDate || '',
      activity_end_date: selectedActivity?.foreachp_endday || props.editTask?.ActivityEndDate || '',
      sign_type: selectedActivity?.sigintype ?? props.editTask?.SignType ?? 0,
      qrcode_type: selectedActivity?.qrcodetype ?? props.editTask?.QRCodeType ?? 0,
    }

    const res = props.editTask
      ? props.adminMode
        ? await updateAdminTask(props.editTask.ID, {
            address: form.address,
            longitude: form.longitude,
            latitude: form.latitude,
            notify_email: form.notify_email,
          })
        : await student.updateTask({ ...payload, task_id: props.editTask.ID })
      : await student.createTask(token.value, payload)

    if ('success' in res ? res.success : true) {
      show(props.editTask ? '任务修改成功' : '任务添加成功', 'success')
      emit('task-added')
      emit('close')
    } else {
      show(res.message || '任务保存失败', 'error')
    }
  } catch (e: any) {
    show(e.message || '任务保存失败', 'error')
  } finally {
    loading.value = false
  }
}

function onMapUpdate(data: { lng: number; lat: number; address: string }) {
  form.longitude = data.lng
  form.latitude = data.lat
  form.address = data.address
}

function describeSignMode(signType?: number, qrType?: number) {
  const modes: string[] = []
  if (signType === 1) modes.push('定位签到')
  else if (typeof signType === 'number' && signType > 0) modes.push(`平台签到类型 ${signType}`)
  if (typeof qrType === 'number' && qrType > 0) modes.push('二维码签到')
  return modes.join(' · ')
}

function getActivityTimeRange(activity: Activity) {
  const start = activity.foreachp_starttime || activity.designate_strattime || ''
  const end = activity.foreachp_endtime || activity.designate_endtime || ''
  return start && end ? `${start}-${end}` : ''
}

function formatClock(value?: string) {
  return value?.match(/\d{1,2}:\d{2}/)?.[0] || value || '未安排'
}

function formatAttempt(value?: string | null) {
  return !value || value.startsWith('0001-') ? '暂无记录' : new Date(value).toLocaleString()
}

function shortDate(value?: string) {
  return value?.slice(0, 10) || '未记录'
}
</script>
