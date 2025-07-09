let timerInterval = null;
let secondsRemaining = 600;

async function getChildrenUserIds(cookieHeader) {
  const res = await fetch("https://apis.roblox.com/parental-controls-api/v1/parental-controls/children-info", {
    method: "GET",
    headers: {
      "Cookie": cookieHeader,
      "Accept": "application/json",
      "Referer": "https://www.roblox.com",
      "Origin": "https://www.roblox.com"
    },
    credentials: "include"
  });
  const data = await res.json();
  return Array.isArray(data.childrenInfoList) ? data.childrenInfoList.map(child => child.userId) : [];
}

async function fetchUniverseIds(url) {
  const res = await fetch(url);
  const text = await res.text();
  return text.split("\n").map(line => line.trim()).filter(Boolean);
}

async function getXCSRFToken(cookieHeader) {
  const res = await fetch("https://apis.roblox.com/parental-controls-api/v1/parental-controls/grant-consent", {
    method: "POST",
    headers: {
      "Cookie": cookieHeader,
      "Content-Type": "application/json",
      "Origin": "https://www.roblox.com",
      "Referer": "https://www.roblox.com"
    },
    credentials: "include",
    body: JSON.stringify({})
  });
  return res.headers.get("x-csrf-token");
}

async function grantConsent(cookieHeader, csrfToken, userId, universeId) {
  const endpoint = "https://apis.roblox.com/parental-controls-api/v1/parental-controls/grant-consent";
  const payload = {
    childUserId: userId,
    consentType: "ManageExperience",
    details: {
      experienceManagementAction: "Block",
      universeId: parseInt(universeId)
    }
  };

  let headers = {
    "Cookie": cookieHeader,
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Csrf-Token": csrfToken,
    "Origin": "https://www.roblox.com",
    "Referer": "https://www.roblox.com"
  };

  let res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    credentials: "include"
  });

  if (res.status === 403) {
    const newToken = res.headers.get("x-csrf-token");
    if (newToken) {
      headers["X-Csrf-Token"] = newToken;
      res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "include"
      });
    }
  }

  return res.status === 200;
}

async function startFlow() {
  const cookies = await chrome.cookies.getAll({ domain: ".roblox.com" });
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

  const userIds = await getChildrenUserIds(cookieHeader);
  const universeIds = await fetchUniverseIds("https://raw.githubusercontent.com/HackCocaine/RobloxBlackList/refs/heads/main/universeids");
  let csrfToken = await getXCSRFToken(cookieHeader);

  const total = userIds.length * universeIds.length;
  let done = 0;

  timerInterval = setInterval(() => {
    secondsRemaining--;
    const mins = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
    const secs = String(secondsRemaining % 60).padStart(2, '0');
    chrome.runtime.sendMessage({ action: "updateTimer", timeLeft: `${mins}:${secs}` });
    if (secondsRemaining <= 0) clearInterval(timerInterval);
  }, 1000);

  const delay = 2000;
  for (const userId of userIds) {
    for (const universeId of universeIds) {
      if (secondsRemaining <= 0) break;
      await grantConsent(cookieHeader, csrfToken, userId, universeId);
      done++;
      const percent = Math.round((done / total) * 100);
      chrome.runtime.sendMessage({ action: "updateProgress", done, total, percent });
      await new Promise(r => setTimeout(r, delay));
    }
  }

  clearInterval(timerInterval);
}

chrome.runtime.onMessage.addListener((req, sender, resp) => {
  if (req.action === "startAutomatedFlow") {
    secondsRemaining = 600;
    startFlow();
  }
});