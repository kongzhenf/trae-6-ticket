# 研发规范与指令 (Agent Instructions)

## PRD 侧边栏交互规范
在这个项目中，任何新页面或新的视图组件开发完毕并产出对应的 PRD（产品需求文档）后，都必须自动加上该 PRD 侧边栏交互功能。详细要求如下：
1. **统一入口位置**：在页面内的右上角区域（与原有页面的排版保持统一）增加一个带有 FileText 图标的「PRD」按钮。
2. **状态与交互设计**：
   - 点击该「PRD」按钮，在当前页面的右侧区域平滑滑出一个悬浮的侧边面板组件（复用 `PrdSidePanel.tsx` 组件）。
   - 侧边面板中利用 markdown 渲染器直接加载渲染对应模块的 PRD 文档。
   - 再次点击该「PRD」按钮，或点击侧边栏顶部的关闭图标，该悬浮面板需平滑收拢并且不破坏页面的原有排版与展示。
3. **按钮动态样式复用**：需要保持按钮根据 `isOpen` 状态的高亮切换效果：
   ```tsx
   className={cn(
     "flex items-center space-x-1.5 border px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm",
     isPrdOpen 
       ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
       : "bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
   )}
   ```
4. **无需询问**：此行为作为项目的全局默认行为，后续出现新页面直接实施上述方案，无需再次跟用户确认。

## PRD 文档同步更新规范
在这个项目中，若当前页面已经生成了对应的 PRD 文档，此后该页面发生的任何设计变更、逻辑变更（如增删字段、修改图表类型、变动筛选条件等），都必须在执行代码修改同时，**同步更新对应 PRD 文档中的需求描述信息**，确保代码与文档时刻保持完全一致。此项同样为全局默认行为，无需单独提醒。

## 语言规范
请记住，在与用户的任何对话和总结中，永远使用**中文**回复。
