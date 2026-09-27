<!-- src/App.vue -->
<template>
  <router-view />
  <ToastContainer ref="toastRef" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { setToastRef } from '@/composables/useToast'

const toastRef = ref<InstanceType<typeof ToastContainer> | null>(null)

onMounted(() => {
  setToastRef(toastRef)
})
</script>
