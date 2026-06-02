---
sidebar_position: 1
title: 簡介
description: Repo Agent 是一個運行在終端中的互動式倉庫助手，結合 REPL 式 Git 工作流與 LLM 驅動的編碼代理。
---

# Repo Agent

**Repo Agent** 是一個運行在終端中的互動式倉庫助手，它可以同時扮演兩個角色：

- **REPL 式 Git 工作流**：它提供了一個 REPL（Read-Eval-Print Loop）式的 Git 工作流，讓你可以在終端中直接與 Git 進行交互，執行各種 Git 命令，管理你的代碼庫。
- **LLM 驅動的編碼代理**：它利用大型語言模型（LLM）來理解你的意圖，並生成相應的代碼片段，幫助你更高效地編寫和修改代碼。

項目底層使用了 [LangChain](https://www.langchain.com/) + [DeepSeek](htttps://www.deepseek.com/)(`(deepseek-chat)`)作為推理引擎

