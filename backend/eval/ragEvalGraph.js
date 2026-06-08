const { createInitialRagEvalState } = require("./ragEvalState");
const nodes = require("./ragEvalNodes");

const workflowNodes = [
  ["load_eval_dataset_node", nodes.load_eval_dataset_node],
  ["document_quality_node", nodes.document_quality_node],
  ["chunk_quality_node", nodes.chunk_quality_node],
  ["metadata_check_node", nodes.metadata_check_node],
  ["retrieval_eval_node", nodes.retrieval_eval_node],
  ["metrics_node", nodes.metrics_node],
  ["answer_eval_node", nodes.answer_eval_node],
  ["root_cause_node", nodes.root_cause_node],
  ["suggestion_node", nodes.suggestion_node]
];

async function runRagEvalGraph(input = {}, deps = {}) {
  let state = createInitialRagEvalState(input);
  state.status = "running";

  for (const [nodeName, nodeFn] of workflowNodes) {
    const startedAt = Date.now();
    state.node_status[nodeName] = {
      status: "running",
      started_at: new Date(startedAt).toISOString()
    };
    try {
      state = await nodeFn(state, deps);
      state.node_status[nodeName] = {
        ...state.node_status[nodeName],
        status: "success",
        duration_ms: Date.now() - startedAt
      };
    } catch (error) {
      state.node_status[nodeName] = {
        ...state.node_status[nodeName],
        status: "failed",
        duration_ms: Date.now() - startedAt,
        error: error.message || "节点执行失败"
      };
      state.status = "failed";
      state.root_causes = [...new Set([...(state.root_causes || []), "评估工作流执行失败"])];
      state.suggestions = [...(state.suggestions || []), `修复节点 ${nodeName}：${error.message || "未知错误"}`];
      return state;
    }
  }

  state.branch = nodes.determineBranch(state);
  state.status = state.branch === "passed" ? "passed" : "needs_improvement";
  return state;
}

module.exports = {
  runRagEvalGraph,
  workflowNodes: workflowNodes.map(([name]) => name)
};
