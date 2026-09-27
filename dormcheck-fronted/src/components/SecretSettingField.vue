<script setup lang="ts">
defineProps<{
  label: string
  name: string
  configured: boolean
}>()

defineEmits<{
  clear: [name: string]
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <label class="flex flex-col gap-2 text-sm font-medium text-slate-700">
    {{ label }}
    <input
      v-model="model"
      type="text"
      autocomplete="off"
      spellcheck="false"
      :placeholder="configured ? '尚未配置' : '请输入密钥'"
      class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
    <span class="mt-1 flex items-center justify-between text-xs font-normal text-slate-500">
      <span>{{ configured ? '当前值已保存' : '尚未设置' }}</span>
      <button
        v-if="configured && name !== 'jwt_secret'"
        type="button"
        class="text-rose-600 hover:underline"
        @click="$emit('clear', name)"
      >清除</button>
    </span>
  </label>
</template>
