<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{ page: number; totalPages: number; loading?: boolean }>()
const emit = defineEmits<{ change: [page: number] }>()
const pageInput = ref(String(props.page))
const pageItems = computed(() => {
  const total = Math.max(1, props.totalPages)
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const visible = new Set([1, total, props.page - 1, props.page, props.page + 1])
  if (props.page <= 4) [2, 3, 4, 5].forEach(value => visible.add(value))
  if (props.page >= total - 3) [total - 4, total - 3, total - 2, total - 1].forEach(value => visible.add(value))
  const sorted = [...visible].filter(value => value >= 1 && value <= total).sort((a, b) => a - b)
  const result: Array<number | 'ellipsis'> = []
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push('ellipsis')
    result.push(value)
  })
  return result
})

watch(() => props.page, value => { pageInput.value = String(value) })

function go(page: number) {
  if (props.loading) return
  const next = Math.max(1, Math.min(props.totalPages, page))
  if (next !== props.page) emit('change', next)
}

function jump() {
  const requested = Number(pageInput.value)
  if (!Number.isInteger(requested)) {
    pageInput.value = String(props.page)
    return
  }
  go(requested)
  pageInput.value = String(Math.max(1, Math.min(props.totalPages, requested)))
}
</script>

<template>
  <nav class="flex flex-wrap items-center justify-end gap-1.5" aria-label="分页">
    <button type="button" class="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40" :disabled="page <= 1 || loading" aria-label="上一页" @click="go(page - 1)"><ChevronLeft :size="16" /><span class="hidden sm:inline">上一页</span></button>
    <template v-for="(item, index) in pageItems" :key="`${item}-${index}`">
      <span v-if="item === 'ellipsis'" class="px-1 text-sm text-slate-400" aria-hidden="true">…</span>
      <button v-else type="button" class="h-9 min-w-9 rounded-lg border px-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-50" :class="item === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'" :aria-current="item === page ? 'page' : undefined" :aria-label="`第 ${item} 页`" :disabled="loading" @click="go(item)">{{ item }}</button>
    </template>
    <button type="button" class="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40" :disabled="page >= totalPages || loading" aria-label="下一页" @click="go(page + 1)"><span class="hidden sm:inline">下一页</span><ChevronRight :size="16" /></button>
    <form class="ml-1 flex h-9 items-center gap-1.5 text-xs text-slate-500" @submit.prevent="jump">
      <label class="sr-only">跳转到第几页</label>
      <span class="hidden sm:inline">跳至</span>
      <input v-model="pageInput" type="number" min="1" :max="totalPages" inputmode="numeric" class="h-9 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm text-slate-700 outline-none focus:border-blue-500" :disabled="loading" aria-label="跳转页码" @keydown.enter.prevent="jump" />
      <span class="hidden sm:inline">/ {{ totalPages }}</span>
      <button type="submit" class="h-9 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40" :disabled="loading">跳转</button>
    </form>
  </nav>
</template>
