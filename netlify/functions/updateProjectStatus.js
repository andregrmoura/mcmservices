// netlify/functions/updateProjectStatus.js
export default async (req) => {
  try {
    // --- Segurança simples (recomendo) ---
    // No seu dashboard, envie o header x-admin-key.
    const adminKey = req.headers.get("x-admin-key") || "";
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    if (req.method !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const body = await req.json().catch(() => ({}));
    const slug = (body.slug || "").trim();
    const projectStatus = (body.projectStatus || "").trim();
    const projectStatusSub = (body.projectStatusSub ?? "").toString(); // opcional

    if (!slug) return json(400, { ok: false, error: "Missing slug" });
    if (!projectStatus) return json(400, { ok: false, error: "Missing projectStatus" });

    // Status permitidos (ajuste como quiser)
    const allowed = new Set(["Planning", "Active", "On Hold", "Completed", "Canceled"]);
    if (!allowed.has(projectStatus)) {
      return json(400, { ok: false, error: "Invalid status" });
    }

    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const BRANCH = process.env.GITHUB_BRANCH || "main";
    const TOKEN = process.env.GITHUB_TOKEN;

    if (!OWNER || !REPO || !TOKEN) {
      return json(500, { ok: false, error: "Missing GitHub env vars" });
    }

    // Caminho do seu JSON (ajuste se seu padrão for diferente)
    // Ex: mcmprosolutions.com/projects/khoudari-coral-gables/ -> normalmente repo: projects/khoudari-coral-gables/project.json
    const path = `projects/${slug}/project.json`;

    // 1) Ler arquivo atual via GitHub Contents API
    const getRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(BRANCH)}`, {
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "netlify-function"
      }
    });

    if (!getRes.ok) {
      const t = await getRes.text();
      return json(getRes.status, { ok: false, error: "Failed to read file", details: t, path });
    }

    const file = await getRes.json();
    const sha = file.sha;
    const raw = Buffer.from(file.content, "base64").toString("utf8");

    // 2) Atualizar SOMENTE as chaves desejadas, preservando ordem/indentação
    const updated = updateJsonLine(raw, "projectStatus", projectStatus);
    const updated2 = updateJsonLine(updated, "projectStatusSub", projectStatusSub);

    if (updated2 === raw) {
      return json(400, { ok: false, error: "No changes applied. Keys not found?" });
    }

    // 3) Commit de volta
    const newBase64 = Buffer.from(updated2, "utf8").toString("base64");

    const putRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "netlify-function",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Update projectStatus to "${projectStatus}" for ${slug}`,
        content: newBase64,
        sha,
        branch: BRANCH
      })
    });

    if (!putRes.ok) {
      const t = await putRes.text();
      return json(putRes.status, { ok: false, error: "Failed to commit file", details: t, path });
    }

    return json(200, { ok: true, slug, projectStatus, projectStatusSub });
  } catch (err) {
    return json(500, { ok: false, error: "Server error", details: String(err?.message || err) });
  }
};

function updateJsonLine(text, key, value) {
  // Troca apenas a linha: "key": "...."
  // Preserva espaços, vírgula, ordem e todo o resto do arquivo.
  const safeValue = escapeJsonString(value);

  // Ex:   "projectStatus": "Active",
  // Captura: (indent+"key": )( "..." )(,?)
  const re = new RegExp(`(^[\\t ]*"${escapeRegExp(key)}"\\s*:\\s*)"([^"]*)"(\\s*,?\\s*$)`, "m");

  if (!re.test(text)) return text;
  return text.replace(re, `$1"${safeValue}"$3`);
}

function escapeJsonString(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function json(statusCode, obj) {
  return new Response(JSON.stringify(obj), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      // Ajuste se seu dashboard e site estão no mesmo domínio, isso já funciona.
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key"
    }
  });
}
