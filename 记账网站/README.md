# 开局账本记账网站

这是当前已经有可运行原型的 Web 项目，主要用于记录德州扑克牌局、玩家买入兑出、抽水分摊和长期战绩。

## 目录结构

- `apps/web/`：网页原型与前端代码
- `docs/product/`：产品设计文档
- `docs/changes/`：已整理的修改方案
- `docs/templates/`：后续需求与修改模板
- `design/requirements/`：原始需求材料

## 运行方式

直接打开 [index.html](/Users/kanyeast/Documents/扑克账本设计/记账网站/apps/web/index.html) 即可。

如果想用本地服务预览，可在仓库根目录执行：

```bash
/Users/kanyeast/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m http.server 4173
```

然后访问 `http://127.0.0.1:4173/%E8%AE%B0%E8%B4%A6%E7%BD%91%E7%AB%99/apps/web/`。

## 当前能力

- 进行中阶段实时追加 `buy-in`
- 牌局结束后统一结算 `cash out`、保险、抽水、其他成本
- 支持玩家库、历史牌局、玩家画像、英雄榜
- 支持本地存储和 JSON 导入导出
- 支持切换到 Supabase 云端同步，多人共用同一本账
- 支持成员邮箱登录后查看完整账本、历史账单和英雄榜
- 支持为单场牌局生成公开分享链接
- 支持通过 GitHub Pages 自动发布到公网

## 关键文档

- 产品设计：[扑克账本产品设计文档.md](/Users/kanyeast/Documents/扑克账本设计/记账网站/docs/product/扑克账本产品设计文档.md)
- 原始需求：[开局扑克账本要求.docx](/Users/kanyeast/Documents/扑克账本设计/记账网站/design/requirements/开局扑克账本要求.docx)
- 修改方案：[修改方案_1.1.md](/Users/kanyeast/Documents/扑克账本设计/记账网站/docs/changes/修改方案_1.1.md)
- 部署说明：[上线与多人同步部署说明.md](/Users/kanyeast/Documents/扑克账本设计/记账网站/docs/deployment/上线与多人同步部署说明.md)
- Supabase 表结构：[schema.sql](/Users/kanyeast/Documents/扑克账本设计/记账网站/supabase/schema.sql)
