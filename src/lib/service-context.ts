/**
 * ServiceContext — 业务边界最关键的入参类型
 *
 * 所有 service 函数只接收 ServiceContext 与 input，不直接拿 Request / Response。
 *
 * authKind 用于审计与限流分流：
 *   - session  : Web 用户经 cookie 登录
 *   - apiKey   : 自动化 / CLI / 集成调用
 *   - system   : 后台任务、迁移脚本、CI 等系统级调用
 */
export type ServiceContext = {
  userId: string;
  headers: Headers;
  authKind: "session" | "apiKey" | "system";
};
