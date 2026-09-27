<template>
  <div class="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center rounded-2xl border border-blue-100 bg-white px-5 py-12 text-center shadow-sm">
    <h1 class="text-6xl font-extrabold text-blue-600">404</h1>
    <p class="mt-4 text-xl font-bold text-slate-900">页面未找到</p>
    <p class="mt-2 text-sm text-slate-500">你访问的页面不存在或已被删除。</p>
    <RouterLink
      to="/"
      class="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      返回首页
    </RouterLink>
  </div>
</template>
