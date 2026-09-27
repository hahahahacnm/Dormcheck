<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import AddTaskForm from '../components/AddTaskForm.vue'
import { student, type Task } from '../api/student'
import { getAdminTasksForActivity, type AdminTask } from '../api/admin'
import { getCurrentUser } from '../api/auth'
import { useUser } from '../composables/useUser'

const route = useRoute()
const router = useRouter()
const { token, userRole, setUser, clearUser } = useUser()
const isAdmin = computed(() => userRole.value === 0 || userRole.value === 3)
const task = ref<(Task | AdminTask) | null>(null)
const loading = ref(false)
const error = ref('')
const taskId = computed(() => Number(route.params.taskId) || 0)

function back() {
  router.push('/tasks')
}

function errorText(value: unknown) {
  return axios.isAxiosError(value) ? value.response?.data?.error || '读取任务详情失败。' : value instanceof Error ? value.message : '读取任务详情失败。'
}

async function loadTask() {
  if (!token.value) { error.value = '请先登录后再管理任务。'; return }
  loading.value = true
  error.value = ''
  try {
    const user = await getCurrentUser(token.value)
    setUser(token.value, user.username, user.email, user.role)
    if (!taskId.value) return
    if (isAdmin.value) {
      const activityId = String(route.query.activity_id || '')
      if (!activityId) throw new Error('缺少活动信息，请从任务列表重新打开。')
      const response = await getAdminTasksForActivity(activityId)
      task.value = response.find(item => item.ID === taskId.value) || null
    } else {
      const response = await student.getTasks()
      if (!response.success) throw new Error(response.message || '读取任务详情失败。')
      task.value = response.data.find(item => item.ID === taskId.value) || null
    }
    if (!task.value) error.value = '任务不存在，或你没有查看权限。'
  } catch (cause) {
    error.value = errorText(cause)
    if (axios.isAxiosError(cause) && cause.response?.status === 401) clearUser()
  } finally {
    loading.value = false
  }
}

function finish() {
  router.push({ path: '/tasks', query: { refreshed: String(Date.now()) } })
}

onMounted(loadTask)
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <header class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <p class="text-xs font-bold tracking-[0.16em] text-blue-600">工作空间 / 任务管理</p>
      <h1 class="mt-2 text-2xl font-bold text-slate-900">{{ taskId ? '任务详情与修改' : '添加签到任务' }}</h1>
    </header>

    <div v-if="loading" class="rounded-2xl border border-blue-100 bg-white p-12 text-center text-sm text-slate-500">正在读取任务详情…</div>
    <div v-else-if="error" class="rounded-2xl border border-rose-100 bg-white p-6">
      <p class="text-sm text-rose-700">{{ error }}</p>
      <button type="button" class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" @click="back">返回任务列表</button>
    </div>
    <AddTaskForm v-else :key="taskId || 'new'" page-mode :edit-task="task" :admin-mode="isAdmin" @close="back" @task-added="finish" />
  </div>
</template>
