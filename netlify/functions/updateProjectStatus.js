export async function handler(event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  try {
    // Preflight
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: cors, body: "" };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: cors,
        body: JSON.stringify({ ok: false, error: "Method not allowed" })
      };
    }

    const ADMIN_KEY = process.env.ADMIN_KEY;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = "andregrmoura";
    const REPO_NAME = "mcmservices";
    const BRANCH = "main";

    const headers = event.headers || {};
    const adminKey = headers["x-admin-key"];

    if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
      return {
        statusCode: 401,
        headers: cors,
        body: JSON.stringify({ ok: false, error: "Unauthorized" })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { slug, projectStatus, projectStatusSub } = body;

    if (!slug || !projectStatus) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ ok: false, error: "Missing slug or projectStatus" })
      };
    }

    const filePath = `projects/${slug}/data/project.json`;

    const getRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    if (!getRes.ok) {
      const text = await getRes.text();
      return {
        statusCode: getRes.status,
        headers: cors,
        body: JSON.stringify({
          ok: false,
          error: "Failed to read file",
          path: filePath,
          branch: BRANCH,
          details: text
        })
      };
    }

    const fileData = await getRes.json();
    const currentContent = JSON.parse(
      Buffer.from(fileData.content, "base64").toString("utf8")
    );

    currentContent.projectStatus = projectStatus;
    currentContent.projectStatusSub = projectStatusSub || "";

    const updatedContent = Buffer.from(
      JSON.stringify(currentContent, null, 2)
    ).toString("base64");

    const putRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json"
        },
        body: JSON.stringify({
          message: `Update project status: ${slug} → ${projectStatus}`,
          content: updatedContent,
          sha: fileData.sha,
          branch: BRANCH
        })
      }
    );

    if (!putRes.ok) {
      const text = await putRes.text();
      return {
        statusCode: putRes.status,
        headers: cors,
        body: JSON.stringify({
          ok: false,
          error: "Failed to update file",
          details: text
        })
      };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        ok: true,
        slug,
        projectStatus,
        projectStatusSub
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        ok: false,
        error: err.message
      })
    };
  }
}
