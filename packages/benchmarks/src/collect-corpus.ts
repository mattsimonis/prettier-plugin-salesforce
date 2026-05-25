import { readdir } from "node:fs/promises";
import path from "node:path";
import { routeFile } from "prettier-plugin-salesforce";

export type CorpusFile = {
  path: string;
  extension: string;
  family: FileFamily;
};

export type FileFamily = "apex" | "markup" | "xml" | "other";

type RouteFileFn = (filePath: string) => ReturnType<typeof routeFile>;

export async function collectCorpus(root: string, route: RouteFileFn = routeFile): Promise<CorpusFile[]> {
  const out: CorpusFile[] = [];
  await walk(root, out, route);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

async function walk(dir: string, out: CorpusFile[], route: RouteFileFn): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, out, route);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    const fileRoute = route(fullPath);
    if (fileRoute === "unknown") {
      continue;
    }

    out.push({ path: fullPath, extension, family: classifyFamily(fileRoute) });
  }
}

function classifyFamily(route: ReturnType<typeof routeFile>): FileFamily {
  if (route === "apex" || route === "apex-anonymous") {
    return "apex";
  }
  if (route === "markup" || route === "lwc-html") {
    return "markup";
  }
  if (route === "metadata-xml") {
    return "xml";
  }

  return "other";
}
