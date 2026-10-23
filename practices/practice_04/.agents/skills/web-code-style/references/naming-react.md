# React 命名

React 没有官方 style guide。以下与前端非组件模块形成**双轨文件命名**。通用规则见 `naming-core.md`、`naming-files.md`。

## 双轨文件命名

| 文件角色 | 文件名 | 导出名 |
|----------|--------|--------|
| React 组件 | `PascalCase.tsx` | 同名 `PascalCase` |
| React Hook | `use` + `camelCase.ts` | 同名 |
| 非组件逻辑（api/store/formatter） | `kebab-case.ts` | `camelCase` / `PascalCase` |

JSX 靠**标识符**首字母区分组件与 HTML 标签（`<UserProfile />` vs `<div />`），文件名不是运行时要求。

**仓级覆盖：** 若仓已统一用 kebab-case 组件文件（`user-profile.tsx` 导出 `UserProfile`），保持仓约定，不要在审查里逐个“纠正”。导入时组件标识符始终是 PascalCase。

## 组件

- 文件名与组件函数名一致，都是 `PascalCase`。用组件引用名命名，不用 `displayName` 替代。
- 一个文件一个主组件；小组件可共文件，前提是同一概念且体量小（见 `style-ui.md`）。

## Props

- 普通 prop：`camelCase`（`userName`、`phoneNumber`）。
- 值为 React 组件的 prop：`PascalCase`（`HeaderComponent={DialogHeader}`）。
- 布尔 prop：`is`/`has`/`can` 前缀（`isDisabled`、`hasError`、`canSubmit`）。
- Props 类型：`ComponentNameProps`（`PaymentFormProps`）。

```tsx
<Dialog
  userName="alice"
  isOpen
  onClose={closeDialog}
  HeaderComponent={DialogHeader}
/>
```

## 事件 prop 与处理器

- 回调 prop：`on` + 动作（`onSave`、`onUserSelect`、`onClose`）。
- 组件内处理器优先用动作名（`saveUserData`），复杂键盘场景才用 `handleKeydown` 再分发。见 `naming-core.md`。

## Hook

文件名与函数名都以 `use` 开头：`useAuth.ts` → `function useAuth()`。禁止 `UseAuth.ts` 与 `use-auth.ts`。

## 非组件模块

Service、store、formatter 等不含 JSX 的文件用 `kebab-case`：`user-api.ts`、`auth-store.ts`、`format-date.ts`。Zustand 的 `*.store.ts` 等后缀由 `web-zustand/references/slice-organization.md` 规定，涉及 store 文件命名时先读它，以其为准。

## 目录布局

默认按 feature 分组，组件文件直接放在 feature 目录里：

```
features/user-profile/UserProfile.tsx
features/user-profile/useUserProfile.ts
features/user-profile/user-profile-api.ts
```

仓已采用“每个组件一个目录”（`components/UserProfile/UserProfile.tsx` 加 `index.ts` barrel）的，跟仓，但主实现文件仍要有具名文件名。

## 测试

`UserProfile.test.tsx`、`useAuth.test.ts`，规则见 `naming-files.md`。
