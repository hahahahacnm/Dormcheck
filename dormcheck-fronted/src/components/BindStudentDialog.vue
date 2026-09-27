<template>
  <main class="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
    <header class="flex items-start justify-between gap-3 border-b border-blue-100 px-5 py-4 sm:px-7">
      <div>
        <p class="text-xs font-bold tracking-[0.16em] text-blue-600">学生账号</p>
        <h1 class="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">{{ showTipDialog ? '设置新的学生密码' : isModifyMode ? '更新学生密码' : '绑定学生账号' }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ showTipDialog ? '第三方平台要求更换过于简单的初始密码，完成后会继续验证绑定。' : isModifyMode ? `正在更新学号 ${stuId} 的登录信息。` : '填写可正常登录微学工的学生账号信息。' }}</p>
      </div>
      <div class="flex shrink-0 gap-1">
        <button v-if="!showTipDialog" type="button" class="grid h-9 w-9 place-items-center rounded-lg text-blue-600 hover:bg-blue-50" @click="showHelpDialog = true" aria-label="操作说明"><CircleHelp :size="18" /></button>
        <button type="button" class="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-700" @click="$emit('close')" :aria-label="'返回学生绑定列表'"><ArrowLeft :size="17" /><span class="hidden sm:inline">返回</span></button>
      </div>
    </header>

    <section class="p-5 sm:p-7">
      <form v-if="!showTipDialog" @submit.prevent="bindStudent" class="mx-auto max-w-xl space-y-5">
        <label class="block text-sm font-semibold text-slate-700">学生学号
          <input v-model="stuId" type="text" placeholder="请输入学号" autocomplete="off" class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" :readonly="isModifyMode" required />
        </label>
        <label class="block text-sm font-semibold text-slate-700">微学工密码
          <div class="relative mt-2">
            <input v-model="stuPassword" :type="showPassword ? 'text' : 'password'" placeholder="请输入学生密码" autocomplete="new-password" class="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" required />
            <button type="button" @click="showPassword = !showPassword" class="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-blue-50" :aria-label="showPassword ? '隐藏密码' : '显示密码'"><EyeOff v-if="showPassword" :size="19" /><Eye v-else :size="19" /></button>
          </div>
        </label>
        <p v-if="!isModifyMode" class="-mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm leading-6 text-blue-900">
          初始密码格式：身份证号后六位 + <code class="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">@swmu.cn</code>。例如 <code class="rounded bg-white px-1.5 py-0.5 font-mono">123456@swmu.cn</code>。若已修改过密码，请填写当前密码。
        </p>
        <p class="rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">如果平台提示初始密码过于简单，可直接在下一步设置合规密码，本站会继续完成绑定。</p>
        <div v-if="isDisabled" class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">为避免触发第三方平台风控，请等待 {{ retryCountdown }} 秒后重试。</div>
        <button type="submit" :disabled="loading || isDisabled" class="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:px-7">{{ loading ? (isModifyMode ? '验证中…' : '绑定中…') : isModifyMode ? '更新并验证' : '绑定学生' }}</button>
      </form>

      <form v-else @submit.prevent="submitWeakPasswordChange" class="mx-auto max-w-xl space-y-5">
        <div class="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">原密码使用刚才提交的密码；修改成功后，系统会自动用新密码继续验证并完成绑定。</div>
        <label class="block text-sm font-semibold text-slate-700">新密码<input v-model="newPassword" type="password" autocomplete="new-password" class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="至少 7 位，组合使用字母或数字" required /></label>
        <label class="block text-sm font-semibold text-slate-700">确认新密码<input v-model="confirmNewPassword" type="password" autocomplete="new-password" class="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="再次输入新密码" required /></label>
        <p class="text-xs leading-5 text-slate-500">密码需至少 7 位，并符合平台要求的字母与数字组合规则。</p>
        <p v-if="passwordChangeError" class="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ passwordChangeError }}</p>
        <div class="flex flex-col gap-2 sm:flex-row">
          <button type="submit" :disabled="changingPassword" class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{{ changingPassword ? '修改并验证中…' : '修改密码并继续绑定' }}</button>
          <button type="button" @click="closeTipDialog" :disabled="changingPassword" class="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">返回账号信息</button>
        </div>
      </form>
    </section>
  </main>

  <Teleport to="body">
    <div v-if="showHelpDialog" class="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" @click.self="showHelpDialog = false">
      <section class="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-blue-100 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
        <header class="flex items-center justify-between gap-3"><h2 class="text-lg font-bold text-slate-900">绑定操作说明</h2><button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50" aria-label="关闭说明" @click="showHelpDialog = false"><X :size="18" /></button></header>
        <ol class="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">
          <li>请填写当前可以登录微学工的学号和密码。</li>
          <li>若第三方平台提示密码过于简单，可在本站设置新密码后继续验证。</li>
          <li>已绑定学生无需解绑，直接更新密码并重新验证即可。</li>
        </ol>
        <p class="mt-4 text-xs text-slate-500">电脑和手机浏览器均可完成绑定。</p>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CircleHelp, Eye, EyeOff, X } from 'lucide-vue-next'
import { useUser } from '../composables/useUser'
import { useToast } from '../composables/useToast'
import { student } from '../api/student'

const emit = defineEmits(['close', 'bind-success'])
const { token } = useUser()
const toast = useToast()

const props = defineProps<{ modifyStuId?: string }>()

const stuId = ref(props.modifyStuId || '')
const stuPassword = ref('')
const showPassword = ref(false)
const showHelpDialog = ref(false)
const showTipDialog = ref(false)
const loading = ref(false)
const changingPassword = ref(false)
const newPassword = ref('')
const confirmNewPassword = ref('')
const passwordChangeError = ref('')

const tipGValue = ref<string | null>(null)

const isDisabled = ref(false)
const retryCountdown = ref(20)
let timer: number | null = null
const RETRY_KEY = 'bind-student-retry-end-time'

const isModifyMode = computed(() => !!props.modifyStuId)

// 关闭提示弹窗
function closeTipDialog() {
  if (changingPassword.value) return
  showTipDialog.value = false
  tipGValue.value = null
  newPassword.value = ''
  confirmNewPassword.value = ''
  passwordChangeError.value = ''
}

// 处理密码过于简单
function handlePasswordTooSimple(gValue: string) {
  tipGValue.value = gValue
  newPassword.value = ''
  confirmNewPassword.value = ''
  passwordChangeError.value = ''
  showTipDialog.value = true
}

function meetsPlatformPasswordRule(password: string) {
  if (password.length < 7) return false
  const upper = /[A-Z]/.test(password)
  const lower = /[a-z]/.test(password)
  const digit = /[0-9]/.test(password)
  return (upper && lower) || (upper && digit) || (lower && digit)
}

async function submitWeakPasswordChange() {
  passwordChangeError.value = ''
  if (!token.value || !tipGValue.value) {
    passwordChangeError.value = '修改凭证已失效，请重新提交学生账号信息。'
    return
  }
  if (!meetsPlatformPasswordRule(newPassword.value)) {
    passwordChangeError.value = '新密码不符合平台要求，请调整后重试。'
    return
  }
  if (newPassword.value !== confirmNewPassword.value) {
    passwordChangeError.value = '两次输入的新密码不一致。'
    return
  }

  changingPassword.value = true
  try {
    await student.changeInitialPassword({
      stu_id: stuId.value,
      old_password: stuPassword.value,
      new_password: newPassword.value,
      g: tipGValue.value,
    })
    stuPassword.value = newPassword.value
    showTipDialog.value = false
    tipGValue.value = null
    toast.show('微学工密码已修改，正在继续绑定', 'success')
    await bindStudent()
    newPassword.value = ''
    confirmNewPassword.value = ''
  } catch (err: any) {
    passwordChangeError.value = err.message || '密码修改失败，请检查新密码后重试。'
  } finally {
    changingPassword.value = false
  }
}

// 绑定/修改逻辑
async function bindStudent() {
  if (!token.value) {
    toast.show('请先登录', 'error')
    return
  }
  loading.value = true
  try {
    await student.bindStudentApi(token.value, {
      stu_id: stuId.value,
      password: stuPassword.value,
    })
    toast.show(isModifyMode.value ? '密码修改成功' : '绑定成功', 'success')
    if (!isModifyMode.value) stuId.value = ''
    stuPassword.value = ''
    showPassword.value = false
    emit('bind-success')
    clearRetryCountdown()
  } catch (err: any) {
    const gValue = err.data?.g || err.g
    if (gValue) {
      handlePasswordTooSimple(gValue)
    } else {
      toast.show(err.message || '绑定失败，20秒后可重试', 'error')
      startRetryCountdown()
    }
  } finally {
    loading.value = false
  }
}

// 重试倒计时逻辑
function startRetryCountdown() {
  isDisabled.value = true
  retryCountdown.value = 20
  const endTime = Date.now() + 20 * 1000
  localStorage.setItem(RETRY_KEY, endTime.toString())

  timer && clearInterval(timer)
  timer = setInterval(() => {
    const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
    retryCountdown.value = diff
    if (diff <= 0) clearRetryCountdown()
  }, 1000)
}

function clearRetryCountdown() {
  isDisabled.value = false
  retryCountdown.value = 20
  timer && clearInterval(timer)
  timer = null
  localStorage.removeItem(RETRY_KEY)
}

function checkRetryCountdownOnMounted() {
  const endTimeStr = localStorage.getItem(RETRY_KEY)
  if (endTimeStr) {
    const endTime = Number(endTimeStr)
    const now = Date.now()
    if (endTime > now) {
      isDisabled.value = true
      retryCountdown.value = Math.floor((endTime - now) / 1000)
      timer && clearInterval(timer)
      timer = setInterval(() => {
        const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
        retryCountdown.value = diff
        if (diff <= 0) clearRetryCountdown()
      }, 1000)
    } else {
      clearRetryCountdown()
    }
  }
}

onMounted(() => checkRetryCountdownOnMounted())
onUnmounted(() => { timer && clearInterval(timer); timer = null })
</script>

<style scoped>
input { outline: none; }
</style>
