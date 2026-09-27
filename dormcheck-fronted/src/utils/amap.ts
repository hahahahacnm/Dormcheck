import AMapLoader from '@amap/amap-jsapi-loader'
import instance from '../api'

declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode: string
    }
  }
}

export async function loadAMap() {
	const { data } = await instance.get<{ key: string; security_code: string }>('/app-config/amap')
	if (!data.key || !data.security_code) {
		throw new Error('地图服务尚未配置，请联系管理员')
	}

  window._AMapSecurityConfig = {
    securityJsCode: data.security_code,
  }

  return AMapLoader.load({
    key: data.key,
    version: '2.0',
    plugins: ['AMap.Geocoder', 'AMap.PlaceSearch'],
  })
}
