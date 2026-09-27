<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, LogOut, NotebookPen, Settings, Shield, Users } from 'lucide-vue-next'
import { getCurrentUser, logoutApi } from '../api/auth'
import { useUser } from '../composables/useUser'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { token, userName, userEmail, userRole, setUser, clearUser } = useUser()
const loading = ref(true)
const error = ref('')
const allowed = computed(() => userRole.value === 0 || userRole.value === 3)
const verified = ref(false)
const sections = computed(() => [
  { name: '用户管理', path: '/admin/users', icon: Users },
  { name: '内容发布', path: '/admin/updates', icon: NotebookPen },
  ...(userRole.value === 3 ? [{ name: '参数设置', path: '/admin/settings', icon: Settings }] : []),
])
const currentPage = computed(() => route.path.startsWith('/admin/students/') ? '学生封禁与黑名单' : sections.value.find(item => route.path === item.path)?.name || '后台管理')

function isCurrent(path: string) {
  return route.path === path || (path === '/admin/users' && route.path.startsWith('/admin/students/'))
}

async function refreshIdentity() {
  if (!token.value) { loading.value = false; return }
  loading.value = true
  error.value = ''
  verified.value = false
  try {
    const user = await getCurrentUser(token.value)
    setUser(token.value, user.username, user.email, user.role)
    verified.value = true
  } catch {
    error.value = '无法验证管理员身份，请返回工作区后重试。'
  } finally {
    loading.value = false
  }
}

async function logout() {
  if (!token.value) return
  try {
    await logoutApi(token.value)
    clearUser()
    toast.show('已成功登出', 'success')
    router.push('/')
  } catch (cause) {
    toast.show(cause instanceof Error ? cause.message : '登出失败', 'error')
  }
}

onMounted(refreshIdentity)
</script>

<template>
  <div class="min-h-screen bg-[#f6f9fd] text-slate-900 lg:flex">
    <aside class="hidden w-64 shrink-0 flex-col border-r border-blue-100 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      <RouterLink to="/admin/users" class="flex h-[76px] items-center gap-3 border-b border-blue-50 px-6">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white"><Shield :size="21" /></span>
        <span><strong class="block text-lg leading-tight">DormCheck</strong><span class="text-xs text-slate-500">后台管理</span></span>
      </RouterLink>
      <nav v-if="verified && allowed" class="flex-1 space-y-1 px-3 py-6" aria-label="后台导航">
        <RouterLink v-for="item in sections" :key="item.path" :to="item.path" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition" :class="isCurrent(item.path) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'" :aria-current="isCurrent(item.path) ? 'page' : undefined">
          <component :is="item.icon" :size="18" /><span>{{ item.name }}</span>
        </RouterLink>
      </nav>
      <div v-else class="flex-1"></div>
      <RouterLink to="/" class="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700"><ArrowLeft :size="18" />返回工作区</RouterLink>
    </aside>

    <div class="min-w-0 flex-1">
      <header class="sticky top-0 z-40 border-b border-blue-100 bg-white/95 backdrop-blur-xl">
        <div class="flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div class="min-w-0"><p class="text-xs text-slate-400">后台管理</p><p class="truncate text-lg font-semibold">{{ currentPage }}</p></div>
          <div class="flex shrink-0 items-center gap-2">
            <span class="hidden max-w-44 truncate text-sm text-slate-500 md:inline" :title="userEmail">{{ userName }}</span>
            <RouterLink to="/" class="inline-flex h-10 items-center gap-1.5 rounded-xl border border-blue-200 px-3 text-sm font-medium text-blue-700 hover:bg-blue-50"><ArrowLeft :size="17" /><span class="hidden sm:inline">工作区</span></RouterLink>
            <button v-if="token" type="button" class="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" @click="logout"><LogOut :size="17" /><span class="hidden sm:inline">退出</span></button>
          </div>
        </div>
        <nav v-if="verified && allowed" class="flex gap-1 overflow-x-auto border-t border-blue-50 px-3 py-2 lg:hidden" aria-label="后台导航">
          <RouterLink v-for="item in sections" :key="item.path" :to="item.path" class="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" :class="isCurrent(item.path) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50'" :aria-current="isCurrent(item.path) ? 'page' : undefined"><component :is="item.icon" :size="15" />{{ item.name }}</RouterLink>
        </nav>
      </header>
      <main class="px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div v-if="loading" class="rounded-2xl border border-blue-100 bg-white p-8 text-center text-sm text-slate-500">正在验证管理员身份…</div>
        <div v-else-if="!verified || !allowed" class="rounded-2xl border border-amber-200 bg-white p-6 text-sm text-slate-700">{{ error || '仅管理员可访问后台。' }}</div>
        <router-view v-else />
      </main>
    </div>
  </div>
</template>
