<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { BookOpen, ClipboardList, House, LogIn, LogOut, ScrollText, Shield, Users } from 'lucide-vue-next'
import LoginRegisterModal from '../components/LoginRegisterModal.vue'
import { logoutApi, getCurrentUser } from '../api/auth'
import { useToast } from '../composables/useToast'
import { useUser } from '../composables/useUser'

const route = useRoute()
const toast = useToast()
const { token, isLoggedIn, userName, userEmail, userRole, setUser, clearUser } = useUser()

const loginModal = ref<InstanceType<typeof LoginRegisterModal> | null>(null)

const mainMenu = [
  { name: '个人中心', path: '/', icon: House },
  { name: '学生绑定', path: '/student-bind', icon: Users },
  { name: '任务管理', path: '/tasks', icon: ClipboardList },
  { name: '更新日志', path: '/updates', icon: ScrollText },
  { name: '项目简介', path: '/about', icon: BookOpen },
]

const canManage = computed(() => userRole.value === 0 || userRole.value === 3)
const currentPage = computed(() => {
  if (route.path === '/guide') return '平台使用指南'
  const items = mainMenu
  const exact = items.find(item => item.path === route.path)
  if (exact) return exact.name
  return items.find(item => route.path.startsWith(`${item.path}/`))?.name || 'DormCheck'
})

function isCurrentMenu(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`) || (path === '/about' && route.path === '/guide')
}

function showLogin() {
  loginModal.value?.open('login')
}

async function fetchUserInfo(t: string) {
  try {
    const userInfo = await getCurrentUser(t)
    setUser(t, userInfo.username, userInfo.email, userInfo.role)
  } catch {
    clearUser()
    toast.show('登录状态失效，请重新登录', 'error')
  }
}

function onLoginSuccess(name: string, t = '') {
  setUser(t, name)
  fetchUserInfo(t)
}

async function logout() {
  if (!token.value) return
  try {
    await logoutApi(token.value)
    clearUser()
    toast.show('已成功登出', 'success')
  } catch (err: unknown) {
    toast.show(err instanceof Error ? err.message || '登出失败' : '登出失败', 'error')
  }
}

onMounted(() => {
  if (token.value) fetchUserInfo(token.value)
})
</script>

<template>
  <div class="app-shell min-h-screen text-slate-900">
    <div class="min-h-screen lg:flex">
      <aside class="hidden w-64 shrink-0 flex-col border-r border-blue-100 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <RouterLink to="/" class="flex h-[76px] items-center gap-3 border-b border-blue-50 px-6">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 shadow-sm shadow-blue-200">
            <img src="/logo.svg" alt="" class="h-7 w-7 rounded-full bg-white" />
          </span>
          <span class="min-w-0">
            <strong class="block text-lg leading-tight tracking-tight text-slate-900">DormCheck</strong>
            <span class="block text-[11px] font-medium tracking-wide text-slate-400">自动化托管平台</span>
          </span>
        </RouterLink>

        <div class="flex-1 overflow-y-auto px-3 py-6">
          <p class="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">工作空间</p>
          <nav class="mt-3 space-y-1" aria-label="主要导航">
            <RouterLink
              v-for="item in mainMenu"
              :key="item.path"
              :to="item.path"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
              :class="isCurrentMenu(item.path) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
              :aria-current="isCurrentMenu(item.path) ? 'page' : undefined"
            >
              <component :is="item.icon" :size="18" :stroke-width="1.9" class="shrink-0" />
              <span>{{ item.name }}</span>
            </RouterLink>
          </nav>
        </div>

      </aside>

      <div class="flex min-h-screen min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-40 border-b border-blue-100 bg-white/95 backdrop-blur-xl">
          <div class="flex h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div class="flex min-w-0 items-center gap-3">
              <RouterLink to="/" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 lg:hidden" aria-label="返回首页">
                <img src="/logo.svg" alt="" class="h-7 w-7" />
              </RouterLink>
              <div class="min-w-0">
                <p class="hidden text-xs font-medium text-slate-400 sm:block">工作空间</p>
                <p class="truncate text-base font-semibold text-slate-900 sm:text-lg">{{ currentPage }}</p>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2 sm:gap-3">
              <div v-if="isLoggedIn" class="hidden min-w-0 items-center gap-3 sm:flex">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{{ (userName || '用').slice(0, 1) }}</span>
                <span class="hidden min-w-0 xl:block">
                  <span class="block truncate text-sm font-semibold text-slate-800">{{ userName }}</span>
                  <span class="block max-w-44 truncate text-xs text-slate-400">{{ userEmail }}</span>
                </span>
              </div>
              <RouterLink v-if="canManage" to="/admin/users" class="inline-flex h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100" aria-label="进入后台管理">
                <Shield :size="17" /><span class="hidden sm:inline">后台管理</span>
              </RouterLink>
              <button v-if="isLoggedIn" type="button" class="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700" @click="logout">
                <LogOut :size="17" /><span class="hidden sm:inline">退出</span>
              </button>
              <button v-else type="button" class="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700" @click="showLogin">
                <LogIn :size="17" />登录 / 注册
              </button>
            </div>
          </div>
        </header>

        <main class="relative z-0 min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 sm:py-7 lg:px-8 lg:pb-8">
          <router-view />
        </main>
      </div>
    </div>

    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(30,64,175,0.06)] backdrop-blur-xl lg:hidden" aria-label="移动端主要导航">
      <div class="grid grid-cols-5 px-1 py-1.5">
        <RouterLink
          v-for="item in mainMenu"
          :key="item.path"
          :to="item.path"
          class="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition"
          :class="isCurrentMenu(item.path) ? 'bg-blue-50 text-blue-700' : 'text-slate-500'"
          :aria-current="isCurrentMenu(item.path) ? 'page' : undefined"
        >
          <component :is="item.icon" :size="19" :stroke-width="1.9" />
          <span class="truncate">{{ item.name }}</span>
        </RouterLink>
      </div>
    </nav>

    <LoginRegisterModal ref="loginModal" @loginSuccess="onLoginSuccess" @registerSuccess="username => onLoginSuccess(username, '')" />

  </div>
</template>

<style scoped>
.app-shell {
  background:
    radial-gradient(circle at 85% 0%, rgba(191, 219, 254, 0.28), transparent 34rem),
    #f6f9fd;
}
</style>
