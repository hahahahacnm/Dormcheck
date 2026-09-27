<template>
  <Teleport to="body">
  <div v-if="visible" class="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="sponsor-title">
    <div class="relative max-h-[96dvh] w-full overflow-y-auto rounded-t-2xl border border-blue-100 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
      <button @click="handleClose" class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50" type="button" aria-label="关闭弹窗"><X :size="18" /></button>

      <h2 id="sponsor-title" class="mb-4 text-xl font-bold text-slate-900">激活赞助码</h2>

      <!-- 区别说明 -->
      <p class="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
        激活后将升级为赞助用户，可绑定的学生人数按平台当前设置执行。感谢你支持项目继续运行。
      </p>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="code" class="block mb-1 font-semibold">请输入激活码</label>
          <input
            id="code"
            v-model="code"
            type="text"
            placeholder="激活码"
            class="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            required
            autocomplete="off"
          />
        </div>

        <div class="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            class="text-blue-600 hover:underline text-sm"
            @click="openSponsorSite"
          >
            前往千寻寄售平台赞助
          </button>

          <div class="flex gap-3 sm:justify-end">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              class="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              :disabled="loading"
            >
              {{ loading ? '提交中...' : '确认激活' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
  </Teleport>
</template>


<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import api from '../api'
import { useToast } from '../composables/useToast'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { show } = useToast()

const code = ref('')
const loading = ref(false)

watch(() => props.visible, (val) => {
  if (val) {
    code.value = ''
  }
})

function handleClose() {
  emit('close')
}

function openSponsorSite() {
  window.open('https://68n.cn/F4CTT', '_blank')
}

async function handleSubmit() {
  if (!code.value.trim()) {
    show('请输入激活码', 'error')
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/sponsor-activate', { code: code.value.trim() })
    show(res.data?.message || '激活成功，请刷新当前页面！感谢您的赞助！', 'success')
    handleClose()
  } catch (err: any) {
    const msg = err.response?.data?.message || '激活失败'
    if (msg.includes('已是赞助用户')) {
      show('您已是赞助用户，无需重复激活。如仍想支持我们，欢迎通过打赏的方式再次赞助 ❤', 'info')
    } else {
      show(msg, 'error')
    }
  } finally {
    loading.value = false
  }
}
</script>
