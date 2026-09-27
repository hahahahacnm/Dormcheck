<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BindStudentDialog from '../components/BindStudentDialog.vue'

const route = useRoute()
const router = useRouter()
const studentId = computed(() => typeof route.params.stuId === 'string' ? decodeURIComponent(route.params.stuId) : undefined)

function back() { router.push('/student-bind') }
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <BindStudentDialog :modify-stu-id="studentId" @close="back" @bind-success="back" />
  </div>
</template>
