<template>
  <Teleport to="body">
  <div v-if="visible" class="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
    <div class="relative max-h-[96dvh] w-full overflow-y-auto rounded-t-2xl border border-blue-100 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
      <button @click="close" class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50" type="button" aria-label="关闭弹窗"><X :size="18" /></button>

      <h2 id="change-password-title" class="mb-6 text-xl font-bold text-slate-900">修改密码</h2>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <label class="block text-sm font-semibold text-slate-700">当前密码
        <input
          v-model="form.old"
          type="password"
          placeholder="请输入当前密码"
          class="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          required
        /></label>
        <label class="block text-sm font-semibold text-slate-700">新密码
        <input
          v-model="form.new"
          type="password"
          placeholder="新密码"
          class="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          required
        /></label>
        <label class="block text-sm font-semibold text-slate-700">确认新密码
        <input
          v-model="form.confirm"
          type="password"
          placeholder="确认新密码"
          class="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          required
        /></label>

        <div class="flex justify-end gap-3 pt-4">
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
          >
            确认修改
          </button>
        </div>
      </form>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { X } from 'lucide-vue-next'
import api from '../api'
import { useToast } from '../composables/useToast'
import { useUser } from '../composables/useUser'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { show } = useToast()
const { clearUser } = useUser()
const form = reactive({
  old: '',
  new: '',
  confirm: '',
})

function close() {
  emit('close')
}

async function handleSubmit() {
  if (form.new !== form.confirm) {
    show('两次密码输入不一致', 'error')
    return
  }

  try {
    await api.post('/auth/change-password', {
      old_password: form.old,
      new_password: form.new,
    })

    show('密码修改成功，页面即将刷新', 'success')

    clearUser()

    // 关闭弹窗
    close()

    // 刷新当前页面
    window.location.reload()
  } catch (err: any) {
    show(err.response?.data?.message || '密码修改失败', 'error')
  }
}
</script>
