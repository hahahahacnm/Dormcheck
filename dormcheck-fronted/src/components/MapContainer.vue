<template>
  <div class="space-y-3">
    <div class="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-slate-800">当前签到地点</div>
          <div class="mt-1 break-words text-sm text-slate-600">
            {{ displayAddress }}
          </div>
          <div v-if="hasLocation" class="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span class="rounded bg-white px-2 py-1">经度 {{ formatCoord(props.initialLocation?.lng) }}</span>
            <span class="rounded bg-white px-2 py-1">纬度 {{ formatCoord(props.initialLocation?.lat) }}</span>
          </div>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          @click="openMap"
        >
          {{ mapVisible ? '重新定位' : hasLocation ? '修改定位' : '选择定位' }}
        </button>
      </div>
    </div>

    <div v-if="mapVisible" class="space-y-3 rounded-xl border border-blue-100 bg-white p-3">
      <div class="relative flex flex-col gap-2 sm:flex-row">
        <input
          v-model="searchKeyword"
          type="text"
          class="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="输入地点名称搜索"
          @keyup.enter.prevent="searchPlace"
        />
        <button
          type="button"
          class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          :disabled="loadingMap"
          @click="searchPlace"
        >
          搜索
        </button>

        <ul
          v-if="searchResults.length"
          class="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white text-sm shadow-lg"
        >
          <li
            v-for="(item, index) in searchResults"
            :key="index"
            class="cursor-pointer px-3 py-2 hover:bg-blue-50"
            @click="selectSearchResult(item)"
          >
            <div class="font-medium text-slate-800">{{ item.name }}</div>
            <div class="truncate text-xs text-slate-500">{{ item.address || '暂无详细地址' }}</div>
          </li>
        </ul>
      </div>

      <div class="relative overflow-hidden rounded-lg border border-slate-200">
        <div ref="mapContainer" class="h-72 w-full bg-slate-100 sm:h-80"></div>
        <div
          v-if="loadingMap"
          class="absolute inset-0 grid place-items-center bg-white/80 text-sm text-slate-600 backdrop-blur-sm"
        >
          地图加载中...
        </div>
      </div>

      <p class="text-xs text-slate-500">
        只有在这里搜索或点击地图时，才会更新地点和经纬度。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useToast } from '../composables/useToast'

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode: string
    }
  }
}

const emit = defineEmits<{
  (e: 'update', data: { lng: number; lat: number; address: string }): void
}>()

const props = defineProps<{
  initialLocation?: { lng: number; lat: number; address: string }
}>()

const { show } = useToast()

const mapContainer = ref<HTMLElement | null>(null)
const searchKeyword = ref('')
const searchResults = ref<any[]>([])
const mapVisible = ref(false)
const loadingMap = ref(false)
const amapApi = ref<any>(null)
const map = ref<any>(null)
const marker = ref<any>(null)

const hasLocation = computed(() => Boolean(props.initialLocation?.lng && props.initialLocation?.lat))
const displayAddress = computed(() => props.initialLocation?.address || '还没有选择签到地点')

watch(
  () => props.initialLocation,
  () => {
    if (mapVisible.value) applyInitialLocation()
  },
  { deep: true },
)

onUnmounted(() => {
  map.value?.destroy()
})

async function openMap() {
  mapVisible.value = true
  await nextTick()
  await ensureMap()
}

async function ensureMap() {
  if (map.value || loadingMap.value) return

  loadingMap.value = true
  try {
    const { loadAMap } = await import('../utils/amap')
    const AMap = await loadAMap()

    amapApi.value = AMap
    map.value = new AMap.Map(mapContainer.value, {
      viewMode: '2D',
      zoom: 15,
      center: props.initialLocation?.lng && props.initialLocation?.lat
        ? [props.initialLocation.lng, props.initialLocation.lat]
        : [105.446113, 28.883955],
    })
    marker.value = new AMap.Marker({ map: map.value })
    applyInitialLocation()

    map.value.on('click', (e: any) => {
      const lnglat = e.lnglat
      marker.value.setPosition(lnglat)

      const geocoder = new AMap.Geocoder({ radius: 1000, extensions: 'all' })
      geocoder.getAddress(lnglat, (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          emit('update', {
            lng: lnglat.lng,
            lat: lnglat.lat,
            address: result.regeocode.formattedAddress,
          })
        }
      })
    })
  } catch (e) {
    console.error('AMap 加载失败', e)
    const apiError = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
    show(apiError || (e instanceof Error && e.message ? e.message : '地图加载失败，请稍后重试'), 'error')
  } finally {
    loadingMap.value = false
  }
}

function applyInitialLocation() {
  if (!map.value || !marker.value || !props.initialLocation) return
  const { lng, lat, address } = props.initialLocation
  if (!lng || !lat) return
  const position = [lng, lat]
  map.value.setZoomAndCenter(17, position)
  marker.value.setPosition(position)
  searchKeyword.value = address || ''
}

async function searchPlace() {
  await ensureMap()
  if (!amapApi.value || !searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  const placeSearch = new amapApi.value.PlaceSearch({
    pageSize: 10,
    city: '',
    citylimit: false,
  })

  placeSearch.search(searchKeyword.value.trim(), (status: string, result: any) => {
    if (status === 'complete' && result.poiList) {
      searchResults.value = result.poiList.pois.map((poi: any) => ({
        name: poi.name,
        address: poi.address,
        location: poi.location,
      }))
    } else {
      searchResults.value = []
      show('未找到匹配地点', 'info')
    }
  })
}

function selectSearchResult(item: any) {
  if (!map.value) return
  map.value.setZoomAndCenter(17, item.location)
  marker.value.setPosition(item.location)

  emit('update', {
    lng: item.location.lng,
    lat: item.location.lat,
    address: item.name,
  })

  searchKeyword.value = item.name
  searchResults.value = []
}

function formatCoord(value?: number) {
  return typeof value === 'number' ? value.toFixed(6) : '-'
}
</script>
