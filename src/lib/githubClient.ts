// Minimal GitHub Contents API client for browser usage
// NOTE: Requires a Personal Access Token (classic or fine-grained) with repo contents write permissions.

export type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
};

function toBase64(str: string) {
  // Handle UTF-8 safely in browsers
  return btoa(unescape(encodeURIComponent(str)));
}

async function getFileInfo(path: string, cfg: GitHubConfig) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${cfg.token}`,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub get contents failed: ${res.status}`);
  return res.json();
}

export async function upsertFile(path: string, content: string, message: string, cfg: GitHubConfig) {
  const existing = await getFileInfo(path, cfg);
  const body: any = {
    message,
    content: toBase64(content),
    branch: cfg.branch,
  };
  if (existing?.sha) body.sha = existing.sha;

  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub upsert failed ${res.status}: ${t}`);
  }
  return res.json();
}
