<template>
  <section class="mx-auto max-w-6xl space-y-6">
    <header class="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">超级管理员</p>
      <h1 class="mt-2 text-2xl font-bold text-slate-900">参数设置</h1>
    </header>

    <div v-if="loading" class="rounded-2xl bg-white/90 p-8 text-center text-slate-700 shadow-sm ring-1 ring-slate-200">
      正在读取参数设置…
    </div>
    <div v-if="!loading && !authorized" class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
      <p>{{ errorMessage || '此页面仅对超级管理员开放。' }}</p>
      <button type="button" class="mt-3 rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white" @click="loadSettings">重新读取</button>
    </div>

    <form v-if="authorized && !loading" class="space-y-6" @submit.prevent="save">
      <section class="setting-card">
        <div class="section-heading">
          <h2>任务调度</h2>
          <p>平台按活动最新开始时间重新安排任务（开始后约 5 分钟），调度器每分钟检查到期任务。登录状态刷新和活动信息查询每天按设定时间运行。</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="field">每日刷新学生登录状态
            <input v-model="values.cookie_refresh_time" type="time" required />
          </label>
          <label class="field">学生登录状态刷新并发数
            <input v-model="values.cookie_refresh_concurrency" type="number" min="1" max="20" required />
          </label>
          <label class="field">每日查询并同步活动
            <input v-model="values.activity_audit_time" type="time" required />
          </label>
          <label class="field">失败后最多重试次数
            <input v-model="values.task_max_retries" type="number" min="0" max="20" required />
          </label>
          <label class="field">每批最大并发任务数
            <input v-model="values.task_batch_size" type="number" min="1" max="100" required />
          </label>
        </div>
      </section>

      <section class="setting-card">
        <div class="section-heading">
          <h2>验证码识别 AI</h2>
          <p>配置兼容 OpenAI Chat Completions 的视觉模型接口。</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="field md:col-span-2">API 地址
            <input v-model="values.captcha_ai_base_url" type="url" required />
          </label>
          <label class="field">模型名称
            <input v-model="values.captcha_ai_model" required />
          </label>
          <SecretSettingField label="API 密钥" name="captcha_ai_api_key" :configured="secretConfigured.captcha_ai_api_key" v-model="secretInputs.captcha_ai_api_key" @clear="toggleClear" />
          <label class="field">单次调用超时（秒）
            <input v-model="values.captcha_ai_timeout_seconds" type="number" min="1" max="300" required />
          </label>
          <label class="field">上游验证码获取超时（秒）
            <input v-model="values.school_captcha_timeout_seconds" type="number" min="1" max="120" required />
          </label>
          <label class="field">微学工请求超时（秒）
            <input v-model="values.school_request_timeout_seconds" type="number" min="5" max="120" required />
          </label>
          <label class="field">登录识别尝试次数
            <input v-model="values.captcha_ai_attempts" type="number" min="1" max="10" required />
          </label>
          <label class="field md:col-span-2">系统提示词
            <textarea v-model="values.captcha_ai_system_prompt" rows="2" required />
          </label>
          <label class="field md:col-span-2">验证码识别提示词
            <textarea v-model="values.captcha_ai_user_prompt" rows="2" required />
          </label>
        </div>
      </section>

      <section class="setting-card">
        <div class="section-heading">
          <h2>高德地图</h2>
          <p>地图 SDK 在浏览器运行，因此用户打开地图时会收到此 Web Key 和安全码。请在高德控制台限制可用域名。</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <SecretSettingField label="Web JS API Key" name="amap_web_key" :configured="secretConfigured.amap_web_key" v-model="secretInputs.amap_web_key" @clear="toggleClear" />
          <SecretSettingField label="JS API 安全密钥" name="amap_security_js_code" :configured="secretConfigured.amap_security_js_code" v-model="secretInputs.amap_security_js_code" @clear="toggleClear" />
        </div>
      </section>

      <section class="setting-card">
        <div class="section-heading">
          <h2>邮件服务</h2>
          <p>注册、密码重置和任务通知共用此 SMTP 配置。</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="field">SMTP 主机
            <input v-model="values.smtp_host" required />
          </label>
          <label class="field">SMTP 端口
            <input v-model="values.smtp_port" type="number" min="1" max="65535" required />
          </label>
          <SecretSettingField label="SMTP 用户名 / 发件邮箱" name="smtp_username" :configured="secretConfigured.smtp_username" v-model="secretInputs.smtp_username" @clear="toggleClear" />
          <SecretSettingField label="SMTP 密码 / 授权码" name="smtp_password" :configured="secretConfigured.smtp_password" v-model="secretInputs.smtp_password" @clear="toggleClear" />
          <label class="field">发件人名称
            <input v-model="values.smtp_from_name" required />
          </label>
          <label class="flex items-center gap-3 self-end rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            <input v-model="values.smtp_ssl" type="checkbox" true-value="true" false-value="false" class="h-4 w-4 accent-blue-700" />
            使用 SSL 连接
          </label>
        </div>
      </section>

      <section class="setting-card">
        <div class="section-heading">
          <h2>用户与安全策略</h2>
          <p>绑定人数设为 0 表示不限制。JWT 密钥变更后，所有用户需要重新登录。</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label class="field">普通用户绑定上限
            <input v-model="values.student_limit_user" type="number" min="0" max="10000" required />
          </label>
          <label class="field">赞助用户绑定上限
            <input v-model="values.student_limit_sponsor" type="number" min="0" max="10000" required />
          </label>
          <label class="field">管理员绑定上限
            <input v-model="values.student_limit_admin" type="number" min="0" max="10000" required />
          </label>
          <label class="field">超级管理员绑定上限
            <input v-model="values.student_limit_super_admin" type="number" min="0" max="10000" required />
          </label>
          <label class="field">用户名最少字符数
            <input v-model="values.username_min_length" type="number" min="3" max="64" required />
          </label>
          <label class="field">密码最少字符数
            <input v-model="values.password_min_length" type="number" min="6" max="128" required />
          </label>
          <label class="field">邮箱验证码有效期（分钟）
            <input v-model="values.email_code_ttl_minutes" type="number" min="1" max="1440" required />
          </label>
          <label class="field">验证码重发间隔（秒）
            <input v-model="values.email_code_resend_seconds" type="number" min="0" max="86400" required />
          </label>
          <label class="field">登录有效期（小时）
            <input v-model="values.jwt_expiration_hours" type="number" min="1" max="8760" required />
          </label>
          <SecretSettingField class="lg:col-span-3" label="JWT 签名密钥（更新后需重新登录）" name="jwt_secret" :configured="secretConfigured.jwt_secret" v-model="secretInputs.jwt_secret" @clear="toggleClear" />
        </div>
      </section>

      <div v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ errorMessage }}</div>
      <div v-if="successMessage" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ successMessage }}</div>
      <div class="flex justify-end">
        <button :disabled="saving" class="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
          {{ saving ? '保存中…' : '保存设置' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getAdminSettings, updateAdminSettings, type AdminSettingsSnapshot } from '../api/adminSettings'
import { useUser } from '../composables/useUser'
import SecretSettingField from '../components/SecretSettingField.vue'

const { token } = useUser()
const values = reactive<Record<string, string>>({})
const secretInputs = reactive<Record<string, string>>({})
const secretConfigured = reactive<Record<string, boolean>>({})
const clearSecrets = ref<string[]>([])
const authorized = ref(false)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const originalJwtSecret = ref('')

function applySnapshot(snapshot: AdminSettingsSnapshot) {
  Object.assign(values, snapshot.values)
  Object.assign(secretInputs, snapshot.secrets)
  for (const [key, value] of Object.entries(snapshot.secrets)) secretConfigured[key] = value !== ''
  originalJwtSecret.value = snapshot.secrets.jwt_secret || ''
  clearSecrets.value = []
}

async function loadSettings() {
  loading.value = true
  try {
    applySnapshot(await getAdminSettings())
    authorized.value = true
  } catch (error) {
    const response = (error as { response?: { data?: { error?: string }; status?: number } })?.response
    errorMessage.value = response?.data?.error || '读取设置失败'
    authorized.value = response?.status !== 401 && response?.status !== 403
  } finally {
    loading.value = false
  }
}

function toggleClear(name: string) {
  clearSecrets.value = clearSecrets.value.includes(name)
    ? clearSecrets.value.filter(key => key !== name)
    : [...clearSecrets.value, name]
  secretInputs[name] = ''
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const jwtWillChange = !!secretInputs.jwt_secret?.trim() && secretInputs.jwt_secret !== originalJwtSecret.value
    const result = await updateAdminSettings({
      values: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value ?? '')])),
      secrets: Object.fromEntries(Object.entries(secretInputs).filter(([, value]) => value.trim() !== '')),
      clear_secrets: clearSecrets.value.filter(name => !secretInputs[name]?.trim()),
    })
    applySnapshot(result.settings)
    successMessage.value = jwtWillChange
      ? `${result.message}；JWT 密钥已更新，请重新登录。`
      : result.message
  } catch (error) {
    const responseError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    errorMessage.value = responseError || (error instanceof Error ? error.message : '保存设置失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!token.value) {
    errorMessage.value = '请先登录超级管理员账号。'
    authorized.value = false
    loading.value = false
    return
  }
  await loadSettings()
})
</script>

<style scoped>
.setting-card {
  @apply space-y-5 rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200 sm:p-6;
}
.section-heading h2 {
  @apply text-lg font-bold text-slate-900;
}
.section-heading p {
  @apply mt-1 text-sm text-slate-500;
}
.field {
  @apply flex flex-col gap-2 text-sm font-medium text-slate-700;
}
.field input:not([type='checkbox']),
.field textarea {
  @apply w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100;
}
</style>
