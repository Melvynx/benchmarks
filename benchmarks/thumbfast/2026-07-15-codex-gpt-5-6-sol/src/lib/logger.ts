import { Logger } from "tslog";

const isProduction = process.env.NODE_ENV === "production";

export const logger = new Logger({
  // Don't use `env` here, because we can use the logger in the browser
  minLevel: isProduction ? 3 : 0,
  hideLogPositionForProduction: true,
  prettyLogTemplate: isProduction
    ? "{{logLevelName}}\t"
    : "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t{{filePathWithLine}}\t",
  stylePrettyLogs: !isProduction,
});
