<script setup lang="ts">
import { BookOpen, CircleHelp, Coffee, ExternalLink, Github, MessageCircle, ScrollText, Users } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <header class="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm sm:p-8">
      <div class="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><BookOpen :size="22" /></div>
      <p class="text-xs font-bold tracking-[0.18em] text-blue-600">DORMCHECK</p>
      <h1 class="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">关于 DormCheck</h1>
      <p class="mt-3 max-w-3xl text-pretty text-sm leading-7 text-slate-600 lg:max-w-5xl">DormCheck 面向学生日常事务，提供轻量、可靠的自动化托管服务，简化重复打卡流程，让学生把精力留给学习与生活中更重要的事。</p>
      <RouterLink to="/guide" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><CircleHelp :size="17" />查看使用指南</RouterLink>
    </header>

    <div class="grid gap-5 md:grid-cols-2">
      <section class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
        <div class="flex items-center gap-2 text-blue-700"><Users :size="20" /><h2 class="text-lg font-bold text-slate-900">共享绑定</h2></div>
        <p class="mt-3 text-sm leading-7 text-slate-600">同一学生可以由多个用户绑定，共同查看和维护该学生的任务。</p>
      </section>
      <section class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
        <div class="flex items-center gap-2 text-blue-700"><ScrollText :size="20" /><h2 class="text-lg font-bold text-slate-900">更新日志</h2></div>
        <RouterLink to="/updates" class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">阅读更新日志 <ExternalLink :size="14" /></RouterLink>
      </section>
    </div>

    <section class="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 class="text-lg font-bold text-slate-900">关于项目与支持</h2>
      <p class="mt-3 text-sm leading-7 text-slate-600">普通用户可以使用基础功能；赞助用于支付服务器、地图和消息服务费用。</p>
      <div class="mt-5 flex flex-wrap gap-3">
        <a href="https://afdian.com/a/kiki_666" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"><Coffee :size="17" />支持项目</a>
        <a href="https://github.com/hahahahacnm/Dormcheck" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Github :size="17" />查看开源代码</a>
        <a href="https://qm.qq.com/q/yuMx0hhYVU" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"><MessageCircle :size="17" />联系我们</a>
      </div>
      <details class="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
        <summary class="cursor-pointer text-sm font-semibold text-blue-800">查看赞赏码</summary>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <figure class="rounded-xl bg-white p-4 text-center"><img src="/wechat-qrcode.png" alt="微信赞赏码" class="mx-auto h-36 w-36 rounded-lg object-contain" /><figcaption class="mt-2 text-xs text-slate-500">微信赞赏码</figcaption></figure>
          <figure class="rounded-xl bg-white p-4 text-center"><img src="/alipay-qrcode.jpg" alt="支付宝赞赏码" class="mx-auto h-36 w-36 rounded-lg object-contain" /><figcaption class="mt-2 text-xs text-slate-500">支付宝赞赏码</figcaption></figure>
        </div>
      </details>
    </section>
  </div>
</template>
