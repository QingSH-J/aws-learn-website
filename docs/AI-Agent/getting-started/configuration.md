---
sidebar_position: 2
title: 設定
description: 設定 DeepSeek API 金鑰與環境變數。
---

# 設定

Repo Agent 使用 **DeepSeek** 作為 LLM 後端，啟動前需要先設定 API 金鑰。

## DeepSeek API 金鑰

前往 [DeepSeek 開放平台](https://platform.deepseek.com/) 申請 API 金鑰，然後在**專案根目錄**建立 `.env` 文件：

```bash
# .env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

`.env` 會在啟動時由 `repo_agent/llm.py` 中的 `build_llm()` 透過 `python-dotenv` 自動載入，不需要手動 `export`。

:::caution
`.env` 已被 `.gitignore` 排除，請勿手動將它加入版本控制。
:::

## 環境變數總覽

| 變數 | 預設值 | 說明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | _(必填)_ | DeepSeek API 金鑰，缺少時無法使用自然語言模式 |
| `REPO_AGENT_HOME` | `~/.repo_agent` | REPL 歷史記錄與專案資料的存放目錄 |

## REPO_AGENT_HOME

預設情況下，Repo Agent 會把 REPL 輸入歷史寫到 `~/.repo_agent/history`。如果你想換個位置（例如放在專案目錄內），可以設定：

```bash
export REPO_AGENT_HOME=/path/to/custom/dir
```

或是直接加到 `.env`：

```bash
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
REPO_AGENT_HOME=/path/to/custom/dir
```

路徑計算邏輯位於 `repo_agent/path.py`。
