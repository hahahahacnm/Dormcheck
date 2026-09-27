<template>
  <Teleport to="body">
  <div v-if="visible" class="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" @click.self="cancel">
    <div class="w-full rounded-t-2xl border border-blue-100 bg-white p-5 shadow-2xl sm:max-w-sm sm:rounded-2xl sm:p-6">
      <h3 id="confirm-title" class="text-lg font-bold text-slate-900">确认操作</h3>
      <p id="confirm-message" class="mt-3 break-words text-sm leading-6 text-slate-600">{{ message }}</p>
      <div class="mt-6 flex justify-end gap-3">
        <button
          @click="cancel"
          type="button"
          class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          取消
        </button>
        <button
          @click="confirm"
          type="button"
          class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          确认
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
const message = ref('确认继续操作？')

let resolveFn: ((confirmed: boolean) => void) | null = null

function open(msg: string): Promise<boolean> {
  message.value = msg
  visible.value = true
  return new Promise((resolve) => {
    resolveFn = resolve
  })
}

function cancel() {
  visible.value = false
  resolveFn?.(false)
  resolveFn = null
}

function confirm() {
  visible.value = false
  resolveFn?.(true)
  resolveFn = null
}

defineExpose({ open })
</script>

