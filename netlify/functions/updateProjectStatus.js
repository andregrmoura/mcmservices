// netlify/functions/updateProjectStatus.js

exports.handler = async (event) => {
  try {
    // CORS / preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: "",
      };
    }

    // Auth
    const adminKey = (event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "").trim();
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: false, error: "Unauthorized" }),
      };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    const body = safeJson(event.body);
    const slug = (body.slug || "").trim();
    const projectStatus = (body.projectStatus || "").trim();
    const projectStatusSub = (body.projectStatusSub ?? "").toString();

    if (!slug) return resp(400, { ok: false, error: "Missing slug" });
    if (!projectStatus) return resp(400, { ok: false, error: "Missing projectStatus" });

    const allowed = new Set(["Planning", "Active", "On Hold", "Completed", "Canceled"]);
    if (!allowed.has(projectStatus)) return resp(400, { ok: false, error: "Invalid status" });

    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const BRANCH = process.env.GITHUB_BRANCH || "main";
    const TOKEN = process.env.GITHUB_TOKEN;

    if (!OWNER || !REPO || !TOKEN) {
      return resp(500, {
        ok: false,
        error: "Missing GitHub env vars",
        missing: {
          GITHUB_OWNER: !OWNER,
          GITHUB_REPO: !REPO,
          GITHUB_TOKEN: !TOKEN,
          GITHUB_BRANCH: !process.env.GITHUB_BRANCH,
        },
      });
    }

    const path = `projects/${slug}/project.json`;

    const getUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(
      path
    )}?ref=${encodeURIComponent(BRANCH)}`;

    const getRes = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "netlify-function",
      },
    });

    const getText = await getRes.text();
    if (!getRes.ok) {
      return resp(getRes.status, {
        ok: false,
        error: "Failed to read file",
        path,
        branch: BRANCH,
        details: getText,
      });
    }

    const file = JSON.parse(getText);
    const sha = file.sha;
    const raw = Buffer.from(file.content, "base64").toString("utf8");

    // Atualiza só as linhas (não reordena JSON)
    const updated1 = updateJsonLine(raw, "projectStatus", projectStatus);
    const updated2 = updateJsonLine(updated1, "projectStatusSub", projectStatusSub);

    const newBase64 = Buffer.from(updated2, "utf8").toString("base64");

    const putUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "netlify-function",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Update projectStatus to "${projectStatus}" for ${slug}`,
        content: newBase64,
        sha,
        branch: BRANCH,
      }),
    });

    const putText = await putRes.text();
    if (!putRes.ok) {
      return resp(putRes.status, {
        ok: false,
        error: "Failed to commit file",
        path,
        branch: BRANCH,
        details: putText,
      });
    }

    return resp(200, { ok: true, slug, projectStatus, projectStatusSub, path });
  } catch (err) {
    return resp(500, { ok: false, error: "Server error", details: String(err?.message || err) });
  }

  function resp(statusCode, obj) {
    return { statusCode, headers: corsHeaders(), body: JSON.stringify(obj) };
  }

  function corsHeaders() {
    return {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
  }

  function safeJson(s) {
    try {
      return JSON.parse(s || "{}");
    } catch {
      return {};
    }
  }

  function updateJsonLine(text, key, value) {
    const safeValue = escapeJsonString(value);
    const re = new RegExp(`(^[\\t ]*"${escapeRegExp(key)}"\\s*:\\s*)"([^"]*)"(\\s*,?\\s*$)`, "m");
    if (!re.test(text)) return text;
    return text.replace(re, `$1"${safeValue}"$3`);
  }

  function escapeJsonString(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
};
