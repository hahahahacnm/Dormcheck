<template>
  <div class="relative inline-block" ref="container">
    <span
      ref="trigger"
      class="truncate cursor-pointer"
      @click="onClick"
      @mouseenter="onHoverEnter"
      @mouseleave="onHoverLeave"
    >
      {{ text }}
    </span>

    <teleport to="body">
      <div
        v-if="visible"
        ref="tooltip"
        class="absolute z-50 tooltip-content
               bg-white/70 text-gray-800 text-sm
               rounded-lg shadow-md border border-gray-200
               backdrop-blur-sm px-3 py-2"
        :style="{ top: `${position.top}px`, left: `${position.left}px`, maxWidth: maxWidth + 'px' }"
      >
        {{ formattedText }}
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'

interface Props {
  text: string
  fullText: string
}

const { text, fullText } = defineProps<Props>()

const visible = ref(false)
const position = ref({ top: 0, left: 0 })
const trigger = ref<HTMLElement | null>(null)
const tooltip = ref<HTMLElement | null>(null)

// 格式化文本：逗号、冒号换行
const formattedText = computed(() => {
  if (!fullText) return ''
  return fullText.replace(/，|,/g, '，\n').replace(/：|:/g, '：\n')
})

// tooltip 最大宽度（屏幕宽度减边距）
const maxWidth = Math.min(window.innerWidth - 16, 400)

function updatePosition() {
  if (!trigger.value || !tooltip.value) return

  const rect = trigger.value.getBoundingClientRect()
  const tooltipRect = tooltip.value.getBoundingClientRect()

  // 默认向下显示
  let top = rect.bottom + window.scrollY + 4
  let left = rect.left + window.scrollX

  // 超出右边界
  if (left + tooltipRect.width + 8 > window.innerWidth) {
    left = window.innerWidth - tooltipRect.width - 8
  }

  // 超出底部
  if (top + tooltipRect.height + 8 > window.scrollY + window.innerHeight) {
    top = rect.top + window.scrollY - tooltipRect.height - 4
  }

  position.value.top = top
  position.value.left = left
}

function onClick() {
  visible.value = !visible.value
  nextTick(updatePosition)
  if (visible.value) setTimeout(() => (visible.value = false), 3000)
}

function onHoverEnter() {
  visible.value = true
  nextTick(updatePosition)
}

function onHoverLeave() {
  visible.value = false
}

onMounted(() => {
  window.addEventListener('resize', () => {
    if (visible.value) nextTick(updatePosition)
  })
})
</script>

<style scoped>
.truncate {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tooltip-content {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.5;
  min-width: 100px;
  max-width: 100%;
  transition: box-shadow 0.2s ease;
}

/* Hover 时增加阴影，呼应卡片交互感 */
.tooltip-content:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}
</style>
