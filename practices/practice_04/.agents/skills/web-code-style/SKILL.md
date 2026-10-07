---
name: web-code-style
description: >-
  Web 全栈（React 前端与 Node 服务端）的命名约定与代码风格：标识符、文件、组件/Hook/props
  命名，控制流、函数设计、间接层、JSX 复杂度与注释。写或审 Web 代码时使用，
  即使用户没有明说「命名」或「风格」。
  Not for 渲染性能与 hooks 规则（→ react-best-practices）、类型建模（→ typescript-best-practices）、
  Vue SFC（→ vue-* skills）、formatter/linter 已覆盖的机械规则。
when_to_use: >-
  web-code-style, 起名, 命名审查, 变量名, 文件名, 组件命名, Hook, props 命名, userID, HTTPClient,
  数字枚举, utils 抽屉, 双轨, 可读性, 风格审查, 控制流, 嵌套太深, 墙式条件, 参数过多, 函数太长,
  JSX 堆逻辑
user-invocable: true
metadata:
  author: rockcookies
  version: 3.0.0
---

**范围：** Web 全栈的 TypeScript：React（TSX）前端与 Node 服务端。命名与代码风格的通用规则适用任何层；React 专属规则（组件/Hook 文件名、props、JSX）只用于前端。类型建模与渲染性能归仓内对应技能（见「依赖」），本 skill 只规定它们怎么命名、怎么写得易读。

## 按任务读对应 references

| 任务 | 读哪些 references |
|------|-------------------|
| 命名（任何层） | `references/naming-core.md`、`references/naming-files.md` |
| React 前端的组件/Hook/props/文件名 | `references/naming-react.md` |
| 写/审控制流、函数、注释（任何层） | `references/style-core.md` |
| 写/审组件、JSX、文件内组织 | `references/style-ui.md` |
| 需要长示例 | `references/examples.md` |

只读与当前任务相关的文件，不要一次全读。monorepo 里按**目标文件所在包**选路由：前端包用 React 双轨文件命名，服务端包一律走 `references/naming-files.md` 的 kebab-case 默认轨。Vue SFC 见仓内 `vue-*` skills。

## 优先级与工具边界

仓内 `AGENTS.md`、本地约定、相邻文件的现状，优先于本 skill。拿不准时保持文件内、仓内一致，不要为了套规则而重命名整个模块。

仓内 formatter / linter（Biome、`@antfu/eslint-config`、oxlint 等，以仓内实际配置为准）已强制的规则，以工具为准，审查时不重复提，本 skill 也不写死规则名。行宽、引号、分号、缩进、`else` after `return` 这类机械规则归工具。某类问题反复出现而工具没管，先在仓内工具里补规则，不要往本 skill 里加文字。若仓的工具强制全大写缩写（`HTTPClient`），跟仓。示例代码的格式不代表规定。

## 模式

- **Coding**：写新代码时按速查表与对应 references 组织。
- **Review**：只找工具抓不到的问题：布尔裸名、`handleClick`、`utils`、数字枚举当真实零值、概念名不一致、文件命名与仓约定不符，以及过深嵌套、墙式条件、单调用者包装、JSX 里求值、复述型注释。按「审查输出」汇报。
- **Audit**：全库审查按关注点分组（命名、控制流与函数、UI 与 JSX、文件组织、注释），可并行扫描后合并去重。

## 速查表（命名的唯一规则来源）

| 元素 | 约定 | ✓ | ✗ |
|------|------|---|---|
| 变量、函数、方法 | `camelCase` | `fetchUser` | `FetchUser` |
| 类、接口、类型 | `PascalCase`；接口无 `I` 前缀 | `Repository` | `IRepository` |
| 顶层不可变常量 | `SCREAMING_SNAKE_CASE`，按**角色**命名；局部 `const` 用 `camelCase` | `MAX_RETRY_COUNT` | `THREE` |
| 类内私有字段 | `#camelCase`；仓已用 `private` 关键字则跟仓 | `#token` | `_token` |
| 布尔变量/参数/字段/prop | `is`/`has`/`can`/`should` 前缀 | `isReady` | `active` |
| 类型守卫（`x is T`） | `isX` / `hasX` | `isUser` | `checkUser` |
| 缩写 | 当普通词 | `HttpClient`、`parseUrl`、`userId` | `HTTPClient`、`parseURL`、`userID` |
| 工厂函数 | `create*` | `createLogger` | `newLogger` |
| 泛型参数 | 简单用 `T`，复杂用 `TPascalCase` | `T`、`TKey` | |
| 判别联合的判别字段 | `kind`，值为小写短词 | `{ kind: 'saving' }` | `{ type: 'SAVING' }` |
| 离散状态 | string union 或 `as const` 对象 | `'pending' \| 'paid'` | 数字 `enum` |
| 事件处理器 | 按**动作**命名 | `saveUserData` | `handleClick` |
| 非组件模块文件 | `kebab-case`，名字反映主导出 | `user-api.ts` | `UserApi.ts`、`utils.ts` |
| 业务概念 | 全库一个词 | `user` | `user`/`account`/`person` 混用 |

React 专属的文件名、props、测试后缀等见对应 references，这里不重复。

## 审查输出

每条发现给：`文件:行`、问题（对应哪条规则）、最小修改。按这个顺序排：

1. 可以删除的东西（死代码、单调用者包装、冗余守卫、复述型注释）。
2. 读者负荷问题（过深嵌套、墙式条件、JSX 里求值）。
3. 命名问题。

不顺手做无关重构。改完运行仓内的 typecheck / lint / test 再汇报。

## 依赖

本 skill 依赖以下技能的规则文件。涉及对应问题时先读再判断，不在此复制其内容，规则冲突时以它们为准：

- `web-zustand/references/slice-organization.md` — Zustand 的 `*.store.ts` 等 store 文件后缀与目录布局。涉及 Zustand store/slice 文件命名时先读。
- `typescript-best-practices/references/patterns.md` — 判别联合/branded type 是否该用、`as` 与类型守卫的正确性。涉及类型建模判断时先读。
- `type-system-discipline/SKILL.md` — 类型建模原则，上一条的依据。涉及「怎么建模」而非「怎么命名」时先读。
- `react-best-practices/SKILL.md` — 渲染性能、hooks 依赖与订阅。涉及 React 渲染行为时先读。
