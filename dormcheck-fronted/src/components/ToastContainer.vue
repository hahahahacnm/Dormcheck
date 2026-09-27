<template>
  <div class="pointer-events-none fixed left-3 right-3 top-3 z-[9999] space-y-3 sm:left-auto sm:right-5 sm:top-5 sm:w-full sm:max-w-sm" aria-live="polite">
    <transition-group name="toast-fade" tag="div">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 rounded-xl border border-blue-100 border-l-4 bg-white px-4 py-3 shadow-lg shadow-blue-900/10 transition-all duration-300"
        :class="{
          'border-green-500 text-green-800 bg-green-50': toast.type === 'success',
          'border-red-500 text-red-800 bg-red-50': toast.type === 'error',
          'border-blue-500 text-blue-800 bg-blue-50': toast.type === 'info'
        }"
      >
        <div class="pt-0.5"><CircleCheck v-if="toast.type === 'success'" :size="18" /><CircleX v-else-if="toast.type === 'error'" :size="18" /><Info v-else :size="18" /></div>
        <div class="flex-1 text-sm leading-snug break-words">
          {{ toast.message }}
        </div>
        <button
          class="ml-2 grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-blue-50 hover:text-slate-700"
          @click="removeToast(toast.id)"
          aria-label="关闭提示"
        >
          <X :size="15" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { CircleCheck, CircleX, Info, X } from 'lucide-vue-next'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

const toasts = reactive<Toast[]>([])
let nextId = 1

function addToast(message: string, type: ToastType = 'info', duration = 3000) {
  const id = nextId++

  if (toasts.length >= 3) {
    toasts.shift()
  }

  toasts.push({ id, message, type })

  setTimeout(() => removeToast(id), duration)
}

function removeToast(id: number) {
  const index = toasts.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.splice(index, 1)
  }
}

defineExpose({ addToast })
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
