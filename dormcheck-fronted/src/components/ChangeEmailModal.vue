<template>
  <Teleport to="body">
  <div v-if="visible" class="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="change-email-title">
    <div class="relative max-h-[96dvh] w-full overflow-y-auto rounded-t-2xl border border-blue-100 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
      <button @click="close" class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50" type="button" aria-label="关闭弹窗"><X :size="18" /></button>

      <h2 id="change-email-title" class="mb-6 text-xl font-bold text-slate-900">修改邮箱</h2>

      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- 邮箱输入 -->
        <div>
          <label class="block mb-1 font-semibold" for="email">新邮箱</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="请输入新邮箱"
            class="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <!-- 验证码输入 -->
        <div class="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-end">
          <div class="min-w-0 flex-grow">
            <label class="block mb-1 font-semibold" for="code">验证码</label>
            <input
              id="code"
              v-model="form.code"
              type="text"
              placeholder="请输入验证码"
              class="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>
          <button
            type="button"
            class="min-h-11 shrink-0 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            :disabled="sendingCode || countdown > 0"
            @click="sendCode"
          >
            <span v-if="countdown === 0">发送验证码</span>
            <span v-else>{{ countdown }}秒</span>
          </button>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="close"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="submit"
            class="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
            :disabled="loading"
          >
            {{ loading ? '提交中...' : '确认修改' }}
          </button>
        </div>
      </form>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import api from '../api'
import { useToast } from '../composables/useToast'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { show } = useToast()

const form = reactive({
  email: '',
  code: '',
})

const sendingCode = ref(false)
const loading = ref(false)
const countdown = ref(0)
let timer: number | undefined

watch(() => props.visible, (val) => {
  if (val) {
    form.email = ''
    form.code = ''
    countdown.value = 0
    loading.value = false
    sendingCode.value = false
    clearInterval(timer)
  }
})

function close() {
  emit('close')
}

function startCountdown() {
  countdown.value = 60
  timer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

async function sendCode() {
  if (!form.email) {
    show('请输入新邮箱', 'error')
    return
  }
  sendingCode.value = true
  try {
    await api.post('/auth/send-change-email-code', { email: form.email })
    show('验证码已发送，请查收邮箱', 'success')
    startCountdown()
  } catch (err: any) {
    show(err.response?.data?.message || '验证码发送失败', 'error')
  } finally {
    sendingCode.value = false
  }
}

async function handleSubmit() {
  if (!form.email || !form.code) {
    show('请填写完整信息', 'error')
    return
  }

  loading.value = true
  try {
    await api.post('/auth/change-email', {
      new_email: form.email,
      code: form.code,
    })
    show('邮箱修改成功，请刷新页面', 'success')
    close()
  } catch (err: any) {
    show(err.response?.data?.message || '修改失败', 'error')
  } finally {
    loading.value = false
  }
}
</script>
