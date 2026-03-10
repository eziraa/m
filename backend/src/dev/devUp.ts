import { spawn } from "node:child_process";

async function main() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", "dev"], {
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  child.on("error", () => {
    process.exit(1);
  });
}

void main();
