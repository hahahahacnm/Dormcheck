<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowLeft, BookOpen, CircleCheck } from 'lucide-vue-next'

const sections = [
  { title: '登录并绑定学生', body: '注册 DormCheck 自动化托管平台账号后，在「学生绑定」中填写学号和微学工密码。若第三方平台提示初始密码过于简单，按本站页面设置新密码，系统会继续验证并绑定。' },
  { title: '添加签到任务', body: '进入「任务管理」，选择已绑定学生和该学生可见的活动，再设置签到地点。签到时段由活动信息决定，系统会自动安排执行；用户无需填写签到时间或重试次数。' },
  { title: '查看结果与处理异常', body: '任务列表显示最近执行结果。打开任务详情可以查看活动、时间、重试和地点等信息。活动过期、签到模式改变或学生账号失效时，平台会提示异常；连续三个日期认证失败会停止刷新 Cookie 和邮件提醒，锁定关联任务，且禁止手动执行或恢复，重新验证成功后系统会恢复此前由系统锁定且活动正常的任务。' },
  { title: '手动执行与共享管理', body: '在活动允许签到的时间内，可以手动发起一次签到；手动尝试失败不占用自动重试次数。同一学生可由多个用户绑定，该学生的同一活动任务由这些用户共同查看和管理。' },
  { title: '账号和数据', body: '平台账号密码以哈希形式保存。绑定的微学工凭据用于维持学生登录状态并执行任务；请妥善保管自己的账号，及时更新已变更的学生密码。' },
]
</script>

<template>
  <main class="mx-auto max-w-4xl space-y-5">
    <RouterLink to="/about" class="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"><ArrowLeft :size="17" />返回项目简介</RouterLink>
    <header class="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm sm:p-8">
      <div class="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><BookOpen :size="21" /></div>
      <p class="text-xs font-bold tracking-[0.18em] text-blue-600">帮助中心</p>
      <h1 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">平台使用指南</h1>
    </header>
    <section class="space-y-3">
      <article v-for="(section, index) in sections" :key="section.title" class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
        <div class="flex items-start gap-3"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><CircleCheck :size="17" /></span><div><h2 class="font-bold text-slate-900">{{ index + 1 }}. {{ section.title }}</h2><p class="mt-2 text-sm leading-7 text-slate-600">{{ section.body }}</p></div></div>
      </article>
    </section>
  </main>
</template>
