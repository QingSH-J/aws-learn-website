---
sidebar_position: 3
title: 快速上手
description: 5 分鐘內完成第一次完整的 Repo Agent 工作流程。
---

# 快速上手

完成 [安裝](./installation.md) 與 [設定](./configuration.md) 後，跟著以下步驟在 5 分鐘內體驗一次完整的工作流程。

## 1. 啟動

```bash
repo-agent
```

啟動後會看到歡迎橫幅與 `>` 提示符。

## 2. 載入倉庫

```
> /open ~/code/my-project
```

Repo Agent 會自動向上尋找 `.git` 根目錄，並建立檔案索引：

```
✔ Repository loaded: /Users/me/code/my-project
  Current branch: main
  Files in repository: 42
```

## 3. 瀏覽倉庫結構

```
> /tree
```

以樹狀方式顯示所有已索引的檔案。也可以用 `/files` 取得純列表。

## 4. 用自然語言提問

任何不以 `/` 開頭的輸入都會交給 LLM 代理處理：

```
> 幫我看一下 src/utils.py 裡的 parse_args 是做什麼的
```

代理會自動呼叫 `read_file`、`search_code` 等工具來回答你。

## 5. 查看與管理變更

```
> /diff              # 顯示未暫存的 git diff
> /git-status        # 顯示 git status --short
> /stage src/utils.py
```

## 6. 讓 LLM 產生 Commit Message

先把要提交的檔案 stage 好，再執行：

```
> /commit-message
```

代理會讀取已暫存的 diff，產出一條符合 Conventional Commit 風格的訊息。

## 7. 提交

```
> /commit "refactor: simplify parse_args"
```

## 8. 退出

```
> /quit
```

---

## 完整範例

```
> /open ~/code/my-project
> /tree
> 幫我找出所有呼叫 deprecated_api() 的地方，並把它們替換成 new_api()
> /diff
> /stage src/utils.py
> /stage src/main.py
> /commit-preview
> /commit-message
> /commit "refactor: replace deprecated_api with new_api"
> /quit
```

---

## 下一步

- 查看 [所有斜線指令](../user-guide/repl-commands.md) 的完整參考
- 了解 [自然語言模式](../user-guide/nl-agent.md) 的進階用法
