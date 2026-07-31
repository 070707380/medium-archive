import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // CORS headers
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

  const { passcode, items, item } = req.body || {};
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    return res.status(500).json({ error: 'Server misconfiguration: ADMIN_PASSWORD environment variable is not set.' });
  }

  if (!passcode || passcode.trim() !== expectedPassword.trim()) {
    return res.status(401).json({ error: 'Unauthorized: Invalid passcode' });
  }

  let fullArchive = [];

  if (Array.isArray(items)) {
    fullArchive = items;
  } else if (item && item.title) {
    // Single item update or addition
    const archivePath = path.join(process.cwd(), 'archive.json');
    if (fs.existsSync(archivePath)) {
      try {
        const raw = fs.readFileSync(archivePath, 'utf-8');
        fullArchive = JSON.parse(raw);
      } catch (e) {
        fullArchive = [];
      }
    }
    const newItem = {
      ...item,
      id: item.id || `item-${Date.now()}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const existingIdx = fullArchive.findIndex((i) => i.id === newItem.id);
    if (existingIdx >= 0) {
      fullArchive[existingIdx] = newItem;
    } else {
      fullArchive.unshift(newItem);
    }
  } else {
    return res.status(400).json({ error: 'Bad Request: Missing items or item payload' });
  }

  // GitHub integration if tokens are configured
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (token && repo) {
    try {
      const getFileUrl = `https://api.github.com/repos/${repo}/contents/archive.json?ref=${branch}`;
      const getRes = await fetch(getFileUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Medium-Archive-App',
        },
      });

      let fileSha = null;
      if (getRes.ok) {
        const fileJson = await getRes.json();
        fileSha = fileJson.sha;
      }

      const updatedContent = JSON.stringify(fullArchive, null, 2);
      const encodedContent = Buffer.from(updatedContent).toString('base64');

      await fetch(`https://api.github.com/repos/${repo}/contents/archive.json`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Medium-Archive-App',
        },
        body: JSON.stringify({
          message: `Update archive database [${fullArchive.length} items]`,
          content: encodedContent,
          sha: fileSha,
          branch,
        }),
      });
    } catch (err) {
      console.warn('GitHub sync warning:', err);
    }
  }

  // Save directly to disk
  try {
    const archivePath = path.join(process.cwd(), 'archive.json');
    fs.writeFileSync(archivePath, JSON.stringify(fullArchive, null, 2));

    const publicPath = path.join(process.cwd(), 'public', 'archive.json');
    if (fs.existsSync(path.dirname(publicPath))) {
      fs.writeFileSync(publicPath, JSON.stringify(fullArchive, null, 2));
    }

    return res.status(200).json({
      success: true,
      message: `Successfully saved ${fullArchive.length} entries to archive.json`,
      archive: fullArchive,
    });
  } catch (err) {
    return res.status(500).json({ error: `File write error: ${err.message}` });
  }
}
