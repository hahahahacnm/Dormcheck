<template>
  <main class="mx-auto max-w-6xl space-y-5">
    <section v-if="!isLoggedIn" class="rounded-2xl border border-blue-100 bg-white px-6 py-20 text-center shadow-sm">
      <CircleUserRound :size="40" class="mx-auto text-blue-300" />
      <h1 class="mt-4 text-xl font-semibold text-slate-900">请先登录</h1>
    </section>

    <template v-else>
      <section class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 p-5 text-white shadow-sm sm:p-6">
        <div class="relative z-10">
          <p class="text-sm font-semibold text-blue-100">个人中心</p>
          <h1 class="mt-1 text-2xl font-bold">{{ user.username || '用户' }}</h1>
          <span class="mt-3 inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold">{{ roleText }}</span>
        </div>
        <CircleUserRound :size="170" :stroke-width="1" class="pointer-events-none absolute -bottom-10 right-2 text-white/10 sm:right-12" />
      </section>

      <section v-if="user.banned" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-sm sm:p-6">
        <div class="flex items-start gap-3"><ShieldAlert :size="21" class="mt-0.5 shrink-0 text-rose-600" /><div>
          <h2 class="font-semibold">账号当前处于封禁状态</h2>
          <p class="mt-1 text-sm leading-6">你仍可登录查看账号状态和已有信息；封禁期间不能新增学生绑定或操作任务，已有绑定不会被移除，你仍可自行解绑。</p>
          <p class="mt-2 text-sm"><span class="font-semibold">原因：</span>{{ user.ban_reason || '管理员未填写原因' }}</p>
          <p class="mt-1 text-xs text-rose-700">{{ user.ban_expires_at ? `封禁至 ${formatDate(user.ban_expires_at)}` : '永久封禁' }}；如有疑问请联系管理员。</p>
        </div></div>
      </section>

      <section class="grid gap-4 md:grid-cols-3" aria-label="账号信息">
        <article class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3 text-blue-600"><UserRound :size="18" /><span class="text-sm font-medium text-slate-500">用户名</span></div>
          <p class="mt-4 truncate text-lg font-semibold text-slate-900" :title="user.username">{{ user.username || '加载中…' }}</p>
        </article>
        <article class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3 text-blue-600"><Mail :size="18" /><span class="text-sm font-medium text-slate-500">联系邮箱</span></div>
          <p class="mt-4 truncate text-lg font-semibold text-slate-900" :title="user.email">{{ user.email || '加载中…' }}</p>
        </article>
        <article class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3 text-blue-600"><BadgeCheck :size="18" /><span class="text-sm font-medium text-slate-500">当前身份</span></div>
          <p class="mt-4 text-lg font-semibold text-slate-900">{{ roleText }}</p>
        </article>
      </section>

      <section class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">账号操作</h2>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <button type="button" class="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-800 transition hover:border-blue-200 hover:bg-blue-100" @click="onChangePassword"><KeyRound :size="18" />修改密码</button>
          <button type="button" class="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-800 transition hover:border-blue-200 hover:bg-blue-100" @click="onChangeEmail"><Mail :size="18" />修改邮箱</button>
          <button type="button" class="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-800 transition hover:border-blue-200 hover:bg-blue-100" @click="onSponsor"><Heart :size="18" />赞助入口</button>
        </div>
      </section>
    </template>

    <ChangePasswordModal :visible="showPasswordModal" @close="showPasswordModal = false" />
    <ChangeEmailModal :visible="showEmailModal" @close="showEmailModal = false" />
    <SponsorCodeModal :visible="showSponsorModal" @close="showSponsorModal = false" />
  </main>
</template>

<script setup lang="ts">
import { reactive, computed, ref, watch, onMounted } from 'vue'
import { BadgeCheck, CircleUserRound, Heart, KeyRound, Mail, ShieldAlert, UserRound } from 'lucide-vue-next'
import api from '../api/index'
import ChangePasswordModal from '../components/ChangePasswordModal.vue'
import ChangeEmailModal from '../components/ChangeEmailModal.vue'
import SponsorCodeModal from '../components/SponsorCodeModal.vue'
import { useToast } from '../composables/useToast'
import { useUser } from '../composables/useUser'

const { show } = useToast()
const { isLoggedIn, token } = useUser()

const user = reactive({ username: '', email: '', role: -1, banned: false, ban_reason: '', ban_expires_at: null as string | null })
const showPasswordModal = ref(false)
const showEmailModal = ref(false)
const showSponsorModal = ref(false)

const roleText = computed(() => {
  switch (user.role) {
    case 0: return '管理员'
    case 1: return '普通用户'
    case 2: return '赞助用户'
    case 3: return '超级管理员'
    default: return '未知角色'
  }
})

async function fetchUserInfo() {
  if (!token.value) { resetUser(); return }
  try {
    const res = await api.get('/auth/me')
    user.username = res.data.username
    user.email = res.data.email
    user.role = res.data.role
    user.banned = Boolean(res.data.banned)
    user.ban_reason = res.data.ban_reason || ''
    user.ban_expires_at = res.data.ban_expires_at || null
  } catch {
    show('获取用户信息失败，请重新登录', 'error')
    resetUser()
  }
}

function resetUser() { user.username = ''; user.email = ''; user.role = -1; user.banned = false; user.ban_reason = ''; user.ban_expires_at = null }
function formatDate(value: string) { return new Date(value).toLocaleString() }

watch(isLoggedIn, (val) => { val ? fetchUserInfo() : resetUser() })
onMounted(() => { if (isLoggedIn.value) fetchUserInfo() })

function onChangePassword() { showPasswordModal.value = true }
function onChangeEmail() { showEmailModal.value = true }
function onSponsor() { showSponsorModal.value = true }
</script>
