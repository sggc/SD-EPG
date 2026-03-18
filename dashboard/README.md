# SD-EPG Dashboard

基于 SvelteKit 构建的 EPG 管理仪表盘，部署在 GitHub Pages。

## 功能

- 📊 仪表盘 - 查看运行状态、统计数据
- 🔧 配置管理 - 在线编辑配置文件
- 📦 数据库浏览 - 查看 EPG 数据库
- 📝 日志查看 - 查看运行日志
- 🔐 GitHub OAuth 登录 - 安全编辑私有配置

## 开发

```bash
cd dashboard
npm install
npm run dev
```

## 部署

项目会自动通过 GitHub Actions 部署到 GitHub Pages。

### 配置 OAuth

1. 在 GitHub 创建 OAuth App：
   - Settings → Developer settings → OAuth Apps → New OAuth App
   - Application name: `SD-EPG Dashboard`
   - Homepage URL: `https://sggc.github.io/SD-EPG/`
   - Authorization callback URL: `https://sggc.github.io/SD-EPG/auth/callback`

2. 添加 Repository Secrets：
   - `GITHUB_CLIENT_ID`: OAuth App 的 Client ID
   - `GITHUB_CLIENT_SECRET`: OAuth App 的 Client Secret

3. 更新 `.env` 文件：
   ```
   VITE_GITHUB_CLIENT_ID=你的_client_id
   ```

## 技术栈

- [SvelteKit](https://kit.svelte.dev/) - 前端框架
- [GitHub API](https://docs.github.com/en/rest) - 数据接口
- [GitHub Pages](https://pages.github.com/) - 静态托管
- [GitHub OAuth](https://docs.github.com/en/developers/apps/building-oauth-apps) - 用户认证
