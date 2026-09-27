# DormCheck 前端

## API 地址配置

- 本地开发（`npm run dev`）：默认请求 `http://127.0.0.1:8081/`，对应本地后端。
- 生产构建：默认请求 `https://appdormcheck.kikirepository.cn/`。
- 云端开发或自定义部署：在前端根目录的 `.env.local` 中设置 `VITE_API_BASE` 覆盖默认地址，例如：

```env
VITE_API_BASE=https://your-api.example.com/
```

修改环境变量后请重启 Vite 开发服务器；生产构建需在构建时提供该变量。
