import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // CORS headers for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-passcode'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { passcode, item } = req.body || {};
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    return res.status(500).json({ error: 'Server misconfiguration: ADMIN_PASSWORD environment variable is not set.' });
  }

  if (!passcode || passcode.trim() !== expectedPassword.trim()) {
    return res.status(401).json({ error: 'Unauthorized: Invalid passcode' });
  }

  if (!item || !item.title) {
    return res.status(400).json({ error: 'Bad Request: Missing item data' });
  }

  const newItem = {
    ...item,
    id: item.id || `item-${Date.now()}`,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // If GITHUB_TOKEN & GITHUB_REPO are set, commit to GitHub repository via GitHub REST API
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "owner/repo"
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (token && repo) {
    try {
      // 1. Fetch current archive.json sha and content from GitHub API
      const getFileUrl = `https://api.github.com/repos/${repo}/contents/archive.json?ref=${branch}`;
      const getRes = await fetch(getFileUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Medium-Archive-App',
        },
      });

      let currentData = [];
      let fileSha = null;

      if (getRes.ok) {
        const fileJson = await getRes.json();
        fileSha = fileJson.sha;
        const contentStr = Buffer.from(fileJson.content, 'base64').toString('utf-8');
        currentData = JSON.parse(contentStr);
      }

      // Check if updating existing or adding new
      const existingIdx = currentData.findIndex((i) => i.id === newItem.id);
      if (existingIdx >= 0) {
        currentData[existingIdx] = newItem;
      } else {
        currentData.unshift(newItem);
      }

      // 2. Commit updated archive.json back to GitHub
      const updatedContent = JSON.stringify(currentData, null, 2);
      const encodedContent = Buffer.from(updatedContent).toString('base64');

      const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/archive.json`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Medium-Archive-App',
        },
        body: JSON.stringify({
          message: `Add item: ${newItem.title} [Archive Admin]`,
          content: encodedContent,
          sha: fileSha,
          branch,
        }),
      });

      if (!putRes.ok) {
        const errorData = await putRes.json();
        throw new Error(errorData.message || 'Failed to update GitHub repository');
      }

      return res.status(200).json({
        success: true,
        message: 'Successfully updated archive.json on GitHub repository',
        item: newItem,
        archive: currentData,
      });
    } catch (err) {
      console.error('GitHub API error:', err);
      return res.status(500).json({ error: `GitHub API error: ${err.message}` });
    }
  }

  // Fallback for local runtime / Cloud Run when GitHub token is not present
  try {
    const archivePath = path.join(process.cwd(), 'archive.json');
    let archiveData = [];
    if (fs.existsSync(archivePath)) {
      const raw = fs.readFileSync(archivePath, 'utf-8');
      archiveData = JSON.parse(raw);
    }

    const existingIdx = archiveData.findIndex((i) => i.id === newItem.id);
    if (existingIdx >= 0) {
      archiveData[existingIdx] = newItem;
    } else {
      archiveData.unshift(newItem);
    }

    fs.writeFileSync(archivePath, JSON.stringify(archiveData, null, 2));

    const publicPath = path.join(process.cwd(), 'public', 'archive.json');
    if (fs.existsSync(path.dirname(publicPath))) {
      fs.writeFileSync(publicPath, JSON.stringify(archiveData, null, 2));
    }

    return res.status(200).json({
      success: true,
      message: 'Item saved locally to archive.json',
      item: newItem,
      archive: archiveData,
    });
  } catch (err) {
    return res.status(500).json({ error: `File system write error: ${err.message}` });
  }
}
