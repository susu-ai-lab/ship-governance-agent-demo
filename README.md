# AI辅助数据治理与RAG Agent知识库落地Demo

企业后台/数据治理平台风格 Demo。默认使用 `public/app.js` 内置 mock 数据和 localStorage 跑通“AI辅助数据治理 → 高质量知识库 → RAG检索 → Agent业务应用 → 知识运营反馈”闭环。

当前支持两种 RAG 模式：

- `LocalStorage`：本地演示模式，前端生成本地向量并保存在浏览器 localStorage。
- `Aliyun DashVector`：真实云端向量库模式，通过 Node 后端代理调用阿里云 DashVector 和百炼 Embedding，不在前端暴露 API Key。

## 本地预览

LocalStorage 静态模式：

```bash
cd public
python3 -m http.server 3005
```

Aliyun DashVector 后端代理模式：

```bash
npm install
cp .env.example .env
# 编辑 .env，填入 DashVector 与百炼 Embedding 配置
npm run dev
```

访问：

```text
http://localhost:8787/
```

## Aliyun DashVector 配置

后端读取以下环境变量：

```text
DASHVECTOR_API_KEY=
DASHVECTOR_ENDPOINT=
DASHVECTOR_COLLECTION=ship_rag_demo
DASHSCOPE_API_KEY=
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
EMBEDDING_PROVIDER=aliyun
EMBEDDING_MODEL=text-embedding-v4
EMBEDDING_DIMENSION=1024
```

`text-embedding-v4` 当前按 `EMBEDDING_DIMENSION=1024` 显式请求百炼 Embedding，写入 DashVector 前后端会校验向量长度，确保与 `ship_rag_demo` Collection 的 1024 维配置一致。

前端选择 `Vector Store Mode = Aliyun DashVector` 后，只会调用：

```text
GET /api/health
POST /api/rag/init
POST /api/rag/upsert
POST /api/rag/query
POST /api/eval/run
GET /api/eval/latest
```

写入 DashVector doc fields 包含：

```text
chunk_text、document_name、file_type、chunk_index、source_type、review_status、equipment_name、system、fault_symptom、upload_time
```

如果未配置 `DASHVECTOR_ENDPOINT`、`DASHVECTOR_API_KEY` 或 `DASHSCOPE_API_KEY`，页面会提示“请先配置 DashVector 和百炼 Embedding 环境变量。”

不要在浏览器前端填写真实 API Key；真实密钥只放在 `.env`，由 Express 后端代理调用 DashVector 和百炼 Embedding 服务。

## RAG 评测工作流

后端新增 `src/graphs/ragEvalGraph.js`，使用官方 `@langchain/langgraph` 的 `StateGraph` 管理 RAG 评估 State、Node 和条件分支。`backend/eval` 中的状态和节点函数作为可复用业务节点被真实 LangGraph.js workflow 调用。

评测节点包括：

```text
load_eval_dataset_node
document_quality_node
chunk_quality_node
metadata_check_node
retrieval_eval_node
metrics_node
answer_eval_node
root_cause_node
route_node
suggestion_node
```

`POST /api/eval/run` 会运行一次评测流程，评估资料质量、Chunk质量、metadata完整性、TopK检索命中、回答引用可信度、失败归因和优化建议。

## 真实 LangGraph Agent Runtime

后端新增 `src/graphs/equipmentFaultAgentGraph.js`，使用官方 `@langchain/langgraph` 的 `StateGraph` 跑设备故障 Agent。它不是前端静态链路，而是由后端执行真实 State、Node、Tool 调用、条件路由、审计事件和反馈记录。

当前 Agent 节点包括：

```text
input_node
intent_classify_node
master_data_lookup_node
rag_retrieve_node
graph_query_node
quality_check_node
risk_assess_node
answer_compose_node
human_review_route_node
feedback_record_node
```

对应 Tool 语义：

```text
IntentClassifier
MasterDataTool
RAGRetrieverTool
GraphQueryTool
QualityRuleTool
RiskAssessTool
AnswerComposer
FeedbackRecorderTool
```

后端接口：

```text
POST /api/agent/equipment-fault/run
GET /api/agent/runs/:id
POST /api/agent/runs/:id/feedback
```

运行结果会返回 `agent_run_id`、`node_status`、`tool_calls`、`audit_events`、`citations`、`missing_fields`、`route` 和 `human_review_required`。如果主数据、RAG引用或关键字段不足，LangGraph 会进入 `human_review` 分支；用户反馈会追加到审计日志。

说明：第一版答案生成仍采用可审计的业务模板，重点验证“企业 Agent 编排闭环”。后续可把 `AnswerComposer` 替换为真实大模型调用，并加入权限、工单系统和审批系统 Tool。

## 在线部署

本项目已整理为 GitHub Pages 静态站点，部署内容来自 `public/` 目录。

注意：GitHub Pages 只能运行静态前端，适合展示 `LocalStorage` 模式。`Aliyun DashVector` 模式需要把 `server.js` 部署到支持 Node 的环境，例如 Render、Railway、Fly.io、Vercel Serverless 或自有服务器。

推送到 GitHub 后，在仓库的 `Settings → Pages` 中将 Source 设置为 `GitHub Actions`。每次推送到 `main` 分支都会自动发布。

上线后地址通常为：

```text
https://你的GitHub用户名.github.io/仓库名/
```

## Demo 范围

- 收敛为 5 个主页面：治理驾驶舱、数据接入、AI治理工作台、知识库/RAG检索、Agent应用与知识运营
- 主场景纵向跑通完整闭环：压载泵异常振动 + 轴承温度升高
- 辅助场景只做扩展展示：焊缝 RT/UT 探伤不合格、管路安装干涉/安装偏差
- 数据接入支持历史资料模拟上传：维修工单、设备台账、SOP、检测报告、图片、音频
- 新增数据采集提供设备故障记录表单，提交后生成治理任务并进入 AI治理工作台
- AI治理工作台按步骤执行：AI识别业务对象、字段抽取、术语标准化、主数据候选匹配、数据质量校验、人工确认并入库
- 主案例固定原始记录：“压载泵启动以后震得厉害，轴承位置温度也高，后来换了轴承，重新找正后正常。”
- 入库后生成标准案例“压载泵异常振动与温升案例”、主数据、SOP关联和 6 条图谱三元组
- RAG检索模拟问题“压载泵振动升温怎么排查？”，展示命中的历史案例、检修SOP和振动排查规范
- Agent应用展示调用链：用户问题 → 意图识别 → 主数据匹配 → RAG检索 → 图谱查询 → 数据质量检查 → 生成业务建议 → 引用依据 → 反馈回流
- Agent输出包括标准设备识别、相似案例、可能原因、排查步骤、推荐SOP、需补全字段和低置信度提示
- localStorage 保存治理任务、入库案例、指标变化和操作日志，刷新后保留

## 主要文件

```text
public/index.html
public/styles.css
public/app.js
```
