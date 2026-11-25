#!/usr/bin/env node
import { McpApp } from "./app";
import { log, LogLevel } from "./log";

try {
  McpApp.fromEnv().serveStdio();
} catch (error) {
  log(LogLevel.Error, error);
  process.exit(1);
}
