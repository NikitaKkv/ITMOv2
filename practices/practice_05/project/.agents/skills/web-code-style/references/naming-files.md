# 文件、目录、模块与测试文件命名

React 组件/Hook 文件名的双轨规则见 `naming-react.md`。这里是其余所有模块（含服务端）的规则。

## 默认：kebab-case，名字反映主导出

非组件模块的文件名用连字符分词，并与文件内主要导出的标识符对应：`user-api.ts` 导出 `fetchUser`，`format-date.ts` 导出 `formatDate`。不用 `UserApi.ts`（PascalCase 留给 React 组件文件）或 `user_api.ts`。

## 禁止 `utils` / `helpers` / `common` / `misc`

这些名字不传达职责，会随时间膨胀成抽屉。按职责拆：

```
date.ts      // formatDate
url.ts       // parseUrl
```

## 一概念一文件

每个文件聚焦单一概念，通常只放一个主要可命名导出（一个组件，或一组紧密相关的函数）。拿不准时选更小的文件。`order-validator.ts` 只含订单校验，不要把校验、发邮件、哈希密码放进同一个 `misc.ts`。

## `index.ts` 只作 barrel

`index.ts` 只做重导出，主实现文件仍要有具名文件名，避免目录里全是 `index.ts` 难以导航。

## 目录

目录名用 `kebab-case`。相关文件放在一起，全仓选一种布局并保持一致。不硬性禁止 `hooks/`、`components/` 这类按类型划分的目录，但不要把无关文件堆进同一个大抽屉。

```
features/
└── user-profile/
    ├── user-profile-api.ts
    └── …（组件与 Hook 文件名见 naming-react.md）
```

## 类型定义文件

类型密集的模块可用基名加 `.types.ts`（`user.types.ts`、`api.types.ts`）。

## 测试文件

- **后缀默认 `.test`，全仓只用一种**；仓已统一用 `.spec` 的，跟仓。
- **位置默认与源码同目录**。仓已统一用同级 `__tests__/` 的，跟仓。不要把无关测试集中到顶层杂烩 `tests/`，除非项目已有明确约定且测试与源码分区清晰。
- 文件名 = 源文件基名 + 后缀：`user-api.ts` → `user-api.test.ts`，`UserProfile.tsx` → `UserProfile.test.tsx`，`useAuth.ts` → `useAuth.test.ts`。
- 集成测试加一个词段：`user.integration.test.ts`、`api.e2e.test.ts`。
- 测试专用 helper/fixture 放 `fixtures/` 或 `__tests__/`，或用 `test-` 前缀：`test-helpers.ts`、`create-test-server.ts`。

`describe` / `it` 的行为描述不在本 skill 范围。
