## DeepSeek 翻译插件

这是一个基于 DeepSeek API 的浏览器翻译插件，能够帮助用户便捷地翻译网页内容。

### 功能特点

- 基于 DeepSeek 大语言模型的高质量翻译
- 支持 DeepSeek-V3 和 DeepSeek-R1 模型
- 简洁易用的用户界面
- 可自定义 API 配置

### 开发环境设置

首先，运行开发服务器：

```bash
pnpm dev
# 或
npm run dev
```

在浏览器中加载相应的开发构建版本。例如，如果您正在为 Chrome 浏览器开发（使用 manifest v3），请使用：`build/chrome-mv3-dev`。

您可以通过修改 `popup.jsx` 来编辑弹出窗口。修改后应该会自动更新。

要添加设置页面，只需在项目根目录添加一个 `options.tsx` 文件，并默认导出一个 React 组件。

同样，要添加内容脚本，请在项目根目录添加一个 `content.ts` 文件，导入所需模块并实现相应逻辑，然后在浏览器中重新加载扩展。

### 使用说明

1. 在扩展设置中配置您的 DeepSeek API 密钥
2. 设置首选的 API 地址和模型类型
3. 在网页上选择文本，使用插件进行翻译

### 构建生产版本

运行以下命令：

```bash
pnpm build
# 或
npm run build
```

这将为您的扩展创建一个生产版本的打包文件，可以压缩并发布到各大应用商店。

### 技术栈

- React
- Plasmo 框架
- antd-mobile 组件库

### 项目结构

- `popup.jsx`: 插件弹出窗口入口
- `components/`: 组件目录
- `contents/`: 内容脚本
- `background/`: 后台脚本

### 许可证

MIT
