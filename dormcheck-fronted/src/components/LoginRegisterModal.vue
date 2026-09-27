<template>
  <Teleport to="body">
  <div v-if="visible" class="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="登录与注册">
    <div class="auth-panel relative max-h-[96dvh] w-full overflow-y-auto rounded-t-2xl border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-950/15 sm:max-h-[90dvh] sm:max-w-md sm:rounded-2xl sm:p-6">
      <button @click="close" class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50" type="button" aria-label="关闭弹窗"><X :size="18" /></button>

      <!-- Tab 切换 -->
      <div class="mb-5 mr-8 flex border-b border-blue-100 text-sm">
        <button
          type="button"
          :class="['flex-1 py-2 text-center', activeTab === 'login' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-slate-500']"
          @click="activeTab = 'login'"
        >登录</button>
        <button
          type="button"
          :class="['flex-1 py-2 text-center', activeTab === 'register' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-slate-500']"
          @click="activeTab = 'register'"
        >注册</button>
        <button
          type="button"
          :class="['flex-1 py-2 text-center', activeTab === 'forgot' ? 'border-b-2 border-blue-600 font-semibold text-blue-700' : 'text-slate-500']"
          @click="activeTab = 'forgot'"
        >忘记密码</button>
      </div>

      <!-- 登录表单 -->
      <form v-if="activeTab === 'login'" @submit.prevent="onLogin">
        <div class="mb-4">
          <label class="block mb-1">用户名/邮箱</label>
          <input v-model="loginForm.username" type="text" required class="w-full border rounded px-3 py-2" />
        </div>
        <div class="mb-4 relative">
          <label class="block mb-1">密码</label>
          <input
            :type="loginPasswordVisible ? 'text' : 'password'"
            v-model="loginForm.password"
            required
            class="w-full border rounded px-3 py-2 pr-10"
          />
          <button
            type="button"
            @click="loginPasswordVisible = !loginPasswordVisible"
            class="absolute right-2 top-8 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50"
            :aria-label="loginPasswordVisible ? '隐藏密码' : '显示密码'"
            tabindex="-1"
          ><EyeOff v-if="loginPasswordVisible" :size="18" /><Eye v-else :size="18" /></button>
        </div>
        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          :disabled="loading"
        >登录</button>
      </form>

      <!-- 注册表单 -->
      <form v-else-if="activeTab === 'register'" @submit.prevent="onRegister">
        <div class="mb-4">
          <label class="block mb-1">用户名</label>
          <input v-model="registerForm.username" type="text" required class="w-full border rounded px-3 py-2" />
        </div>

        <div class="mb-4 relative">
          <label class="block mb-1">密码</label>
          <input
            :type="registerPasswordVisible ? 'text' : 'password'"
            v-model="registerForm.password"
            required
            class="w-full border rounded px-3 py-2 pr-10"
          />
          <button
            type="button"
            @click="registerPasswordVisible = !registerPasswordVisible"
            class="absolute right-2 top-8 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50"
            :aria-label="registerPasswordVisible ? '隐藏密码' : '显示密码'"
            tabindex="-1"
          ><EyeOff v-if="registerPasswordVisible" :size="18" /><Eye v-else :size="18" /></button>
        </div>

        <div class="mb-4 relative">
          <label class="block mb-1">确认密码</label>
          <input
            :type="confirmPasswordVisible ? 'text' : 'password'"
            v-model="registerForm.confirmPassword"
            required
            class="w-full border rounded px-3 py-2 pr-10"
          />
          <button
            type="button"
            @click="confirmPasswordVisible = !confirmPasswordVisible"
            class="absolute right-2 top-8 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50"
            :aria-label="confirmPasswordVisible ? '隐藏密码' : '显示密码'"
            tabindex="-1"
          ><EyeOff v-if="confirmPasswordVisible" :size="18" /><Eye v-else :size="18" /></button>
        </div>

        <div class="mb-4">
          <label class="block mb-1">邮箱</label>
          <input v-model="registerForm.email" type="email" required class="w-full border rounded px-3 py-2" />
        </div>

        <div class="mb-4">
          <label class="block mb-1">验证码</label>
          <div class="flex gap-2">
            <input v-model="registerForm.code" type="text" required class="flex-1 border rounded px-3 py-2" />
            <button
              type="button"
              @click="sendCode"
              :class="[
                'px-3 py-2 rounded transition',
                codeCooldown > 0 || !isRegisterEmailValid
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              ]"
              :disabled="codeCooldown > 0 || !isRegisterEmailValid"
            >
              {{ codeCooldown > 0 ? `重发(${codeCooldown})` : '获取验证码' }}
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition"
          :disabled="loading"
        >注册</button>
      </form>

      <!-- 忘记密码表单 -->
      <form v-else @submit.prevent="onResetPassword">
        <div class="mb-4">
          <label class="block mb-1">邮箱</label>
          <input v-model="forgotForm.email" type="email" required class="w-full border rounded px-3 py-2" />
        </div>

        <div class="mb-4">
          <label class="block mb-1">验证码</label>
          <div class="flex gap-2">
            <input v-model="forgotForm.code" type="text" required class="flex-1 border rounded px-3 py-2" />
            <button
              type="button"
              @click="sendCode"
              :class="[
                'px-3 py-2 rounded transition',
                codeCooldown > 0 || !isForgotEmailValid
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              ]"
              :disabled="codeCooldown > 0 || !isForgotEmailValid"
            >
              {{ codeCooldown > 0 ? `重发(${codeCooldown})` : '获取验证码' }}
            </button>
          </div>
        </div>

        <div class="mb-4 relative">
          <label class="block mb-1">新密码</label>
          <input
            :type="forgotPasswordVisible ? 'text' : 'password'"
            v-model="forgotForm.newPassword"
            required
            class="w-full border rounded px-3 py-2 pr-10"
          />
          <button
            type="button"
            @click="forgotPasswordVisible = !forgotPasswordVisible"
            class="absolute right-2 top-8 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50"
            :aria-label="forgotPasswordVisible ? '隐藏密码' : '显示密码'"
            tabindex="-1"
          ><EyeOff v-if="forgotPasswordVisible" :size="18" /><Eye v-else :size="18" /></button>
        </div>

        <button
          type="submit"
            class="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition"
          :disabled="loading"
        >重置密码</button>
      </form>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Eye, EyeOff, X } from 'lucide-vue-next'
import { login, type LoginRequest, register, type RegisterRequest } from '../api/auth'
import api from '../api'
import { useToast } from '../composables/useToast'

const { show } = useToast()
const emits = defineEmits<{
  (e: 'loginSuccess', username: string, token: string): void
  (e: 'registerSuccess', username: string): void
  (e: 'close'): void
}>()

const visible = ref(false)
const activeTab = ref<'login' | 'register' | 'forgot'>('login')
const loading = ref(false)

const loginPasswordVisible = ref(false)
const registerPasswordVisible = ref(false)
const confirmPasswordVisible = ref(false)
const forgotPasswordVisible = ref(false)

const codeCooldown = ref(0)
let timer: any = null

const loginForm = ref<LoginRequest>({
  username: '',
  password: '',
})

const registerForm = ref<RegisterRequest & {
  confirmPassword?: string
  email?: string
  code?: string
}>({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  code: '',
})

const forgotForm = ref({
  email: '',
  code: '',
  newPassword: '',
})

// 邮箱格式验证函数
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// 计算邮箱是否有效（注册和忘记密码分别单独判断）
const isRegisterEmailValid = computed(() => isValidEmail(registerForm.value.email || ''))
const isForgotEmailValid = computed(() => isValidEmail(forgotForm.value.email || ''))

function open(tab: 'login' | 'register' | 'forgot' = 'login') {
  activeTab.value = tab
  visible.value = true
  loading.value = false

  loginForm.value = { username: '', password: '' }
  registerForm.value = { username: '', password: '', confirmPassword: '', email: '', code: '' }
  forgotForm.value = { email: '', code: '', newPassword: '' }

  loginPasswordVisible.value = false
  registerPasswordVisible.value = false
  confirmPasswordVisible.value = false
  forgotPasswordVisible.value = false
}

function close() {
  visible.value = false
  emits('close')
}

function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
}

async function onLogin() {
  loading.value = true
  try {
    const encodedPwd = base64Encode(loginForm.value.password)
    const resp = await login({
      username: loginForm.value.username,
      password: encodedPwd,
    })

    show('登录成功', 'success')
    emits('loginSuccess', loginForm.value.username, resp.token)
    close()
  } catch (err: any) {
    show(err?.message || '登录失败', 'error')
  } finally {
    loading.value = false
  }
}

async function onRegister() {
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    show('两次输入的密码不一致', 'error')
    return
  }

  loading.value = true
  try {
    const encodedPwd = base64Encode(registerForm.value.password)

    await register({
      username: registerForm.value.username,
      password: encodedPwd,
      email: registerForm.value.email!,
      code: registerForm.value.code!,
    })
    show('注册成功，请登录', 'success')
    activeTab.value = 'login'
  } catch (err: any) {
    show(err?.message || '注册失败', 'error')
  } finally {
    loading.value = false
  }
}

async function sendCode() {
  let email = ''
  let purpose = ''
  if (activeTab.value === 'register') {
    email = registerForm.value.email || ''
    purpose = 'register'
  } else if (activeTab.value === 'forgot') {
    email = forgotForm.value.email || ''
    purpose = 'reset'
  } else {
    return
  }

  if (!email) {
    show('请填写邮箱', 'error')
    return
  }

  try {
    await api.post('/auth/send-code', {
      email,
      purpose,
    })
    show('验证码已发送，请查收邮箱', 'success')
    startCooldown()
  } catch (err: any) {
    show(err?.response?.data?.error || '发送失败', 'error')
  }
}

function startCooldown() {
  codeCooldown.value = 60
  timer = setInterval(() => {
    if (codeCooldown.value > 0) {
      codeCooldown.value--
    } else {
      clearInterval(timer)
    }
  }, 1000)
}

async function onResetPassword() {
  loading.value = true
  try {
    if (!forgotForm.value.email || !forgotForm.value.code || !forgotForm.value.newPassword) {
      show('请完整填写表单', 'error')
      loading.value = false
      return
    }
    const encodedPwd = base64Encode(forgotForm.value.newPassword)
    await api.post('/auth/reset-password', {
      email: forgotForm.value.email,
      code: forgotForm.value.code,
      new_password: encodedPwd,
    })
    show('密码重置成功，请使用新密码登录', 'success')
    activeTab.value = 'login'
  } catch (err: any) {
    show(err?.response?.data?.error || '密码重置失败', 'error')
  } finally {
    loading.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.auth-panel input {
  min-height: 2.65rem;
  border-color: #cbd5e1;
  border-radius: 0.75rem;
  outline: none;
}
.auth-panel input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px #dbeafe;
}
.auth-panel label {
  color: #334155;
  font-size: 0.875rem;
  font-weight: 600;
}
.auth-panel button[type="submit"] {
  min-height: 2.65rem;
  border-radius: 0.75rem;
  font-weight: 600;
}
</style>
