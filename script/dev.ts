import "dotenv/config";
import { execSync } from "node:child_process";
import path from "node:path";
import { spawn } from "node:child_process";

const port = Number.parseInt(process.env.PORT || "5100", 10);

function clearListeningPort(targetPort: number) {
  try {
    const output = execSync(`lsof -ti tcp:${targetPort} -sTCP:LISTEN`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();

    if (!output) {
      return;
    }

    const pids = Array.from(
      new Set(
        output
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        // Ignore already-exited processes.
      }
    }
  } catch {
    // Ignore when nothing is listening on the target port.
  }
}

clearListeningPort(port);

const tsxBinary = path.resolve(import.meta.dirname, "..", "node_modules", ".bin", "tsx");
const child = spawn(tsxBinary, ["watch", "server/index.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
