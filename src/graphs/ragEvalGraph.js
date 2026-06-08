const { Annotation, END, START, StateGraph } = require("@langchain/langgraph");
const { createInitialRagEvalState } = require("../../backend/eval/ragEvalState");
const evalNodes = require("../../backend/eval/ragEvalNodes");

const RagEvalState = Annotation.Root({
  run_id: Annotation(),
  questions: Annotation(),
  documents: Annotation(),
  chunks: Annotation(),
  expected_answers: Annotation(),
  document_quality: Annotation(),
  chunk_quality: Annotation(),
  metadata_quality: Annotation(),
  retrieval_results: Annotation(),
  metrics: Annotation(),
  answer_evaluation: Annotation(),
  root_causes: Annotation(),
  suggestions: Annotation(),
  status: Annotation(),
  route: Annotation(),
  branch: Annotation(),
  node_status: Annotation(),
  langgraph: Annotation(),
  vectorStoreMode: Annotation(),
  topK: Annotation(),
  threshold: Annotation()
});

const graphNodeNames = [
  "load_eval_dataset_node",
  "document_quality_node",
  "chunk_quality_node",
  "metadata_check_node",
  "retrieval_eval_node",
  "metrics_node",
  "answer_eval_node",
  "root_cause_node",
  "route_node",
  "suggestion_node"
];

async function runRagEvalGraph(options = {}, deps = {}) {
  const initialState = {
    ...createInitialRagEvalState(options),
    vectorStoreMode: options.vectorStoreMode || "Aliyun DashVector",
    topK: Number(options.topK || 5),
    threshold: Number(options.threshold || 0.6),
    route: "pending",
    branch: "pending",
    langgraph: {
      enabled: true,
      package: "@langchain/langgraph",
      graph: "StateGraph",
      nodes: graphNodeNames
    }
  };

  const graph = createRagEvalStateGraph(deps);
  const app = graph.compile();
  const finalState = await app.invoke(initialState);
  return {
    ...finalState,
    status: finalState.route === "passed" ? "passed" : "needs_improvement",
    branch: finalState.route,
    langgraph: {
      ...(finalState.langgraph || {}),
      enabled: true,
      compiled: true,
      executed_at: new Date().toISOString()
    }
  };
}

function createRagEvalStateGraph(deps = {}) {
  return new StateGraph(RagEvalState)
    .addNode("load_eval_dataset_node", withNodeStatus("load_eval_dataset_node", (state) => evalNodes.load_eval_dataset_node(state)))
    .addNode("document_quality_node", withNodeStatus("document_quality_node", (state) => evalNodes.document_quality_node(state)))
    .addNode("chunk_quality_node", withNodeStatus("chunk_quality_node", (state) => evalNodes.chunk_quality_node(state)))
    .addNode("metadata_check_node", withNodeStatus("metadata_check_node", (state) => evalNodes.metadata_check_node(state)))
    .addNode("retrieval_eval_node", withNodeStatus("retrieval_eval_node", (state) => evalNodes.retrieval_eval_node(state, {
      queryRag: (question, topK, filters) => queryRagByMode(state, deps, question, topK, filters)
    })))
    .addNode("metrics_node", withNodeStatus("metrics_node", (state) => evalNodes.metrics_node(state)))
    .addNode("answer_eval_node", withNodeStatus("answer_eval_node", (state) => evalNodes.answer_eval_node(state)))
    .addNode("root_cause_node", withNodeStatus("root_cause_node", (state) => evalNodes.root_cause_node(state)))
    .addNode("route_node", withNodeStatus("route_node", route_node))
    .addNode("suggestion_node", withNodeStatus("suggestion_node", (state) => evalNodes.suggestion_node(state)))
    .addEdge(START, "load_eval_dataset_node")
    .addEdge("load_eval_dataset_node", "document_quality_node")
    .addEdge("document_quality_node", "chunk_quality_node")
    .addEdge("chunk_quality_node", "metadata_check_node")
    .addEdge("metadata_check_node", "retrieval_eval_node")
    .addEdge("retrieval_eval_node", "metrics_node")
    .addEdge("metrics_node", "answer_eval_node")
    .addEdge("answer_eval_node", "root_cause_node")
    .addEdge("root_cause_node", "route_node")
    .addConditionalEdges("route_node", (state) => state.route || "passed", {
      document_issue: "suggestion_node",
      chunk_issue: "suggestion_node",
      metadata_issue: "suggestion_node",
      retrieval_issue: "suggestion_node",
      passed: "suggestion_node"
    })
    .addEdge("suggestion_node", END);
}

async function route_node(state) {
  const route = determineRoute(state);
  return {
    route,
    branch: route,
    status: route === "passed" ? "passed" : "needs_improvement"
  };
}

function determineRoute(state) {
  if (state.document_quality?.severe_issue) return "document_issue";
  if ((state.chunk_quality?.total_chunks || 0) > 0 && (state.chunk_quality?.severe_issue || state.chunk_quality?.pass_rate < 0.8)) return "chunk_issue";
  if (state.metadata_quality?.severe_issue || state.metadata_quality?.completeness < 0.9) return "metadata_issue";
  if ((state.metrics?.recall_at_3 || 0) < Number(state.threshold || 0.6)) return "retrieval_issue";
  return "passed";
}

function withNodeStatus(nodeName, nodeFn) {
  return async (state) => {
    const startedAt = Date.now();
    try {
      const update = await nodeFn(state);
      return {
        ...update,
        node_status: {
          ...(state.node_status || {}),
          [nodeName]: {
            status: "success",
            started_at: new Date(startedAt).toISOString(),
            duration_ms: Date.now() - startedAt
          }
        }
      };
    } catch (error) {
      return {
        status: "failed",
        route: "document_issue",
        root_causes: [...new Set([...(state.root_causes || []), "评估工作流执行失败"])],
        suggestions: [...(state.suggestions || []), `修复节点 ${nodeName}：${error.message || "未知错误"}`],
        node_status: {
          ...(state.node_status || {}),
          [nodeName]: {
            status: "failed",
            started_at: new Date(startedAt).toISOString(),
            duration_ms: Date.now() - startedAt,
            error: error.message || "节点执行失败"
          }
        }
      };
    }
  };
}

async function queryRagByMode(state, deps, question, topK, filters) {
  if (state.vectorStoreMode === "Aliyun DashVector" && typeof deps.queryRag === "function") {
    return deps.queryRag(question, Number(topK || state.topK || 5), filters);
  }
  return localStorageStyleQuery(state, question, Number(topK || state.topK || 5));
}

function localStorageStyleQuery(state, question, topK) {
  const queryTerms = tokenize(question);
  const chunks = normalizeLocalChunks(state);
  const results = chunks.map((chunk) => {
    const text = `${chunk.chunk_text} ${Object.values(chunk.metadata || {}).join(" ")}`;
    const terms = tokenize(text);
    const hitCount = queryTerms.filter((term) => terms.includes(term) || text.includes(term)).length;
    const score = queryTerms.length ? hitCount / queryTerms.length : 0;
    return {
      ...chunk,
      score: Number((1 - score).toFixed(4)),
      similarity: Math.round(score * 100)
    };
  }).sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  return {
    ok: true,
    provider: "LocalStorage",
    collection: "local_eval",
    count: results.length,
    results
  };
}

function normalizeLocalChunks(state) {
  if (Array.isArray(state.chunks) && state.chunks.length) {
    return state.chunks.map((chunk, index) => ({
      id: chunk.id || chunk.chunk_id || `local_chunk_${index + 1}`,
      chunk_text: chunk.text || chunk.chunk_text || "",
      document_name: chunk.metadata?.document_name || chunk.document_name || `local_document_${index + 1}`,
      metadata: {
        document_name: chunk.metadata?.document_name || chunk.document_name || `local_document_${index + 1}`,
        source_type: chunk.metadata?.source_type || chunk.source_type || "-",
        equipment_name: chunk.metadata?.equipment_name || chunk.equipment_name || "-",
        system: chunk.metadata?.system || chunk.system || "-",
        review_status: chunk.metadata?.review_status || chunk.review_status || "已审核",
        quality_status: chunk.metadata?.quality_status || chunk.quality_status || "可引用"
      }
    }));
  }
  return (state.documents || []).map((doc, index) => ({
    id: `local_doc_${index + 1}`,
    chunk_text: [
      doc.chunk_text,
      doc.text,
      doc.document_name,
      doc.source_type,
      doc.equipment_name,
      doc.system
    ].filter(Boolean).join("；"),
    document_name: doc.document_name || doc.name || `local_document_${index + 1}`,
    metadata: {
      document_name: doc.document_name || doc.name || `local_document_${index + 1}`,
      source_type: doc.source_type || doc.metadata?.source_type || "-",
      equipment_name: doc.equipment_name || doc.metadata?.equipment_name || "-",
      system: doc.system || doc.metadata?.system || "-",
      review_status: doc.review_status || doc.metadata?.review_status || "已审核",
      quality_status: doc.quality_status || doc.metadata?.quality_status || "可引用"
    }
  }));
}

function tokenize(text) {
  return String(text || "").match(/[\u4e00-\u9fa5]{2,4}|[a-z0-9]+/gi) || [];
}

module.exports = {
  RagEvalState,
  runRagEvalGraph,
  createRagEvalStateGraph,
  graphNodeNames
};
