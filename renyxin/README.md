# 🌸 二次元天堂 - Anime Portal

一个现代、精美的二次元主题网站，融合《原神》/《崩坏》风格的扁平化UI设计。

## ✨ 核心功能

### 1. **Pretext 技术应用**

- 文字与背景图像的完美融合
- 鼠标移动时的实时视差效果
- 滚动时的平滑动画
- 创造独特的视觉层次感

### 2. **昼夜交替主题**

- 🌙 **夜间模式**：深色背景，减少眼睛疲劳
- ☀️ **日间模式**：明亮背景，清晰舒适
- 自动检测系统偏好设置
- localStorage 持久化主题选择
- 快捷键切换：`Ctrl+T`（Windows/Linux）或 `Cmd+T`（Mac）

### 3. **现代扁平化 UI**

- 类似《原神》/《崩坏》的视觉风格
- 渐变色主题（粉红色 + 紫色）
- 圆润的卡片设计
- 毛玻璃效果（Glassmorphism）
- 流畅的动画过渡

### 4. **交互动画**

- ⬆️ 页面加载时的淡入动画
- 🎯 按钮悬停效果与涟漪效果
- 🎨 卡片滚动动画
- 🖱️ 鼠标跟踪视差效果
- 📜 滚动视差效果

### 5. **响应式设计**

- 完全适配桌面、平板、手机
- 流体布局
- 智能网格系统

## 📁 项目结构

```
renyxin/
├── index.html       # 主要HTML文件
├── styles.css       # 完整的CSS样式表
├── script.js        # JavaScript交互逻辑
└── res/
    ├── 样式.png                    # Pretext效果参考
    └── 胡桃（核心素材）.png        # 动漫角色素材
```

## 🚀 快速开始

### 方法1：直接打开

1. 双击 `index.html` 文件
2. 浏览器将直接打开网站

### 方法2：使用本地服务器（推荐）

```bash
# 使用Python 3
python -m http.server 8000

# 使用Python 2
python -m SimpleHTTPServer 8000

# 使用Node.js (http-server)
npx http-server
```

然后在浏览器中访问 `http://localhost:8000`

## 🎓 技术实现细节

### HTML5 语义化结构

```html
<nav>           <!-- 导航栏 -->
<main>          <!-- 主要内容 -->
  <section>     <!-- 各个章节 -->
</main>
<footer>        <!-- 页脚 -->
```

### CSS3 高级特性

- ✨ **CSS Grid** - 响应式网格布局
- 🎨 **CSS Variables** - 主题变量系统
- 🎭 **Backdrop Filter** - 毛玻璃效果
- 🌈 **Linear Gradient** - 渐变色背景
- ✅ **Transform** - 2D/3D变形动画
- ⏱️ **Transition & Animation** - 流畅动画

### Vanilla JavaScript

- 📜 **类编程**：面向对象的代码组织
- 🎯 **事件监听**：mousemove, scroll, click
- 💾 **localStorage**：主题持久化
- 🎬 **RequestAnimationFrame**：性能优化
- 🔍 **DOM API**：元素操作和查询

## ⌨️ 快捷键

| 快捷键             | 功能         |
| ------------------ | ------------ |
| `Ctrl+T` / `Cmd+T` | 切换昼夜主题 |
| `Ctrl+D` / `Cmd+D` | 返回顶部     |
| 点击 🌙/☀️         | 手动切换主题 |

## 🎨 色彩方案

### 浅色模式（Light Mode）

```
背景：#ffffff（纯白）
文字：#1a1a2e（深蓝黑）
强调色：#ff6b9d（粉红）
次强调：#c06c84（紫红）
```

### 深色模式（Dark Mode）

```
背景：#0f0f1e（深紫黑）
文字：#e0e0e0（浅灰）
强调色：#ff6b9d（粉红 - 保持不变）
次强调：#c06c84（紫红 - 保持不变）
```

## 🔧 自定义指南

### 1. 更换背景图片

编辑 `index.html`，替换图片路径：

```html
<img src="res/你的图片.png" alt="Character" />
```

### 2. 更改主题色

编辑 `styles.css` 的 `:root` 变量：

```css
--accent-primary: #ff6b9d; /* 主强调色 */
--accent-secondary: #c06c84; /* 次强调色 */
```

### 3. 调整文字

编辑 `index.html` 中的文本内容

### 4. 添加新的导航链接

在 `.nav-menu` 中添加新的 `<li>` 和 `<section>`

## 🌐 浏览器支持

| 浏览器  | 版本 | 支持状态    |
| ------- | ---- | ----------- |
| Chrome  | 90+  | ✅ 完全支持 |
| Firefox | 88+  | ✅ 完全支持 |
| Safari  | 14+  | ✅ 完全支持 |
| Edge    | 90+  | ✅ 完全支持 |
| IE      | 11   | ❌ 不支持   |

## 📸 页面亮点

1. **Hero 区域** - 大型Pretext效果展示
2. **角色展廊** - 响应式卡片网格
3. **关于区域** - 统计数据展示
4. **联系表单** - 互动反馈系统

## 🎬 动画清单

- 📌 页面加载淡入
- ⬆️ 滚动时卡片浮起
- 🖱️ 鼠标悬停缩放
- 🎯 按钮点击涟漪
- 🌊 背景视差移动
- 💫 导航下划线动画

## 🔐 性能优化

- ✅ 使用 RequestAnimationFrame 优化滚动性能
- ✅ CSS Transform 替代 position 改变
- ✅ 防止频繁 DOM 查询
- ✅ 事件节流处理
- ✅ 图片优化（可使用WebP格式）

## 📝 文件大小

- `index.html` - ~8KB
- `styles.css` - ~15KB
- `script.js` - ~12KB
- **总计** - ~35KB（未压缩）

## 🚀 进阶功能建议

1. **添加更多素材**
   - 白天/夜晚不同背景
   - 多个角色轮换
   - 季节变化主题

2. **增强交互**
   - 音效反馈
   - 粒子效果
   - 视频背景

3. **性能提升**
   - 图片懒加载
   - 代码分割
   - 缓存策略

4. **功能扩展**
   - 旗语言切换
   - 偏好设置界面
   - 评论系统

## 💡 开发技巧

### 调试视差效果

在浏览器控制台调整参数：

```javascript
const effect = new PretextEffect();
effect.maxOffset = 100; // 增加偏移量
```

### 测试深色模式

```javascript
document.body.classList.add("dark-mode");
localStorage.setItem("theme", "dark");
```

### 查看性能

按 F12 打开开发者工具 → Performance 标签

## 📚 参考资源

- [MDN Web Docs](https://developer.mozilla.org/)
- [CSS-Tricks](https://css-tricks.com/)
- [Web.dev](https://web.dev/)

## 🤝 如何扩展

### 添加新的Pretext效果区域

```javascript
const newEffect = document.querySelector(".pretext-bg");
newEffect.addEventListener("mousemove", (e) => {
  // 自定义逻辑
});
```

### 自定义动画

在 `styles.css` 中添加新的 `@keyframes`：

```css
@keyframes customAnimation {
  from {
    /* 初始状态 */
  }
  to {
    /* 结束状态 */
  }
}
```

## 📞 支持

- 检查浏览器控制台的错误信息
- 确保所有文件都在正确的文件夹中
- 清除浏览器缓存后重新刷新
- 检查图片路径是否正确

## 📄 许可证

自由使用和修改，用于个人或商业项目。

---

**创建日期**: 2026年4月14日  
**技术栈**: HTML5 + CSS3 + Vanilla JavaScript  
**主题**: 《原神》/《崩坏》风格的二次元网页

希望你喜欢这个创意网站！🌸✨
