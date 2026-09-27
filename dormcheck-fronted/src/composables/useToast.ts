// src/composables/useToast.ts
import type { Ref } from 'vue'
import type ToastContainer from '../components/ToastContainer.vue'

let toastRef: Ref<InstanceType<typeof ToastContainer> | null>

export function setToastRef(ref: Ref<InstanceType<typeof ToastContainer> | null>) {
  toastRef = ref
}

export function useToast() {
  return {
    show: (msg: string, type: 'success' | 'error' | 'info' = 'info', duration?: number) => {
      toastRef?.value?.addToast(msg, type, duration)
    },
  }
}
