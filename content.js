let isDrawing = false;
let startX, startY;
let path = [];
let canvas, ctx;
let gesturePerformed = false;
let gestureStarted = false;
const minGestureDistance = 20;

let animationFrameId = null;
const MAX_PATH_POINTS = 200;

let draggedLink = null;
let dragStartX, dragStartY;

let extensionEnabled = true;
let notificationElement = null;

let settings = defaultSettings();

function createCanvas() {
  if (canvas) {
    canvas.remove();
    canvas = null;
    ctx = null;
  }

  canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "2147483647";
  canvas.style.willChange = "transform";
  canvas.style.display = "block";
  canvas.style.visibility = "visible";
  document.body.appendChild(canvas);

  ctx = canvas.getContext("2d", {
    alpha: true,
    desynchronized: true,
  });

  resizeCanvas();
  let resizeTimeout;
  const debouncedResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 100);
  };

  window.addEventListener("resize", debouncedResize);
}

function createNotification() {
  if (notificationElement) return notificationElement;

  notificationElement = document.createElement("div");
  notificationElement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    background: rgba(0, 0, 0, 0.15);
    color: #ffffffff;
    padding: 16px 32px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    font-weight: 500;
    z-index: 10000000;
    transition: transform 0.2s ease;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    text-align: center;
    min-width: 160px;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  `;
  document.body.appendChild(notificationElement);
  return notificationElement;
}

function showNotification(message, type = "success") {
  if (!extensionEnabled) return;

  const notification = createNotification();

  const colors = {
    success: "rgba(16, 185, 129, 0.6)",
    error: "rgba(239, 68, 68, 0.8)",
    info: "rgba(8, 145, 178, 0.8)",
  };

  notification.style.background = colors[type] || "rgba(0, 0, 0, 0.7)";
  notification.textContent = message;
  notification.style.transform = "translate(-50%, -50%) scale(1)";

  setTimeout(() => {
    notification.style.transform = "translate(-50%, -50%) scale(0)";
  }, 1500);
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);
}

function drawPath() {
  if (!ctx || !canvas) {
    return;
  }

  if (!settings.showPath) {
    return;
  }

  if (!extensionEnabled) {
    return;
  }

  ctx.clearRect(
    0,
    0,
    canvas.width / (window.devicePixelRatio || 1),
    canvas.height / (window.devicePixelRatio || 1)
  );

  if (path.length < 1) {
    return;
  }

  const color = hexToRgba(settings.pathColor, 0.8);
  ctx.strokeStyle = color;
  ctx.lineWidth = settings.lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(startX, startY);

  for (let i = 0; i < path.length; i++) {
    ctx.lineTo(startX + path[i].x, startY + path[i].y);
  }
  ctx.stroke();

  if (path.length > 5) {
    const lastPoint = path[path.length - 1];
    const prevPoint = path[Math.max(0, path.length - 6)];
    const dx = lastPoint.x - prevPoint.x;
    const dy = lastPoint.y - prevPoint.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      const arrowDirection = dx > 0 ? 1 : -1;
      drawArrow(
        startX + lastPoint.x,
        startY + lastPoint.y,
        arrowDirection,
        color
      );
    } else if (Math.abs(dy) > Math.abs(dx)) {
      const arrowDirection = dy > 0 ? 1 : -1;
      drawVerticalArrow(
        startX + lastPoint.x,
        startY + lastPoint.y,
        arrowDirection,
        color
      );
    }
  }
}

function requestDraw() {
  if (!extensionEnabled) return;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  animationFrameId = requestAnimationFrame(() => {
    drawPath();
  });
}

document.addEventListener("mousedown", (e) => {
  if (!extensionEnabled || e.button !== 2) return;

  isDrawing = true;
  gestureStarted = false;
  gesturePerformed = false;
  startX = e.clientX;
  startY = e.clientY;
  path = [];

  if (!canvas) {
    createCanvas();
  }

  e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (!isDrawing || !extensionEnabled) return;

  const newPoint = { x: e.clientX - startX, y: e.clientY - startY };
  path.push(newPoint);

  if (path.length > MAX_PATH_POINTS) {
    path = path.slice(-MAX_PATH_POINTS);
  }

  if (
    !gestureStarted &&
    (Math.abs(newPoint.x) > 5 || Math.abs(newPoint.y) > 5)
  ) {
    gestureStarted = true;
  }

  requestDraw();
});

document.addEventListener("mouseup", (e) => {
  if (!isDrawing || !extensionEnabled) return;

  isDrawing = false;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  setTimeout(() => {
    if (ctx)
      ctx.clearRect(
        0,
        0,
        canvas.width / (window.devicePixelRatio || 1),
        canvas.height / (window.devicePixelRatio || 1)
      );
  }, 200);

  if (gestureStarted) {
    const gesture = recognizeGesture(path);
    if (gesture) {
      chrome.runtime.sendMessage({ action: gesture }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
        }
      });

      chrome.runtime.sendMessage({ action: "updateStats" });

      const gestureNames = {
        goBack: "返回上一页",
        goForward: "前进下一页",
        closeTab: "关闭标签页",
        scrollToTop: "滚动到顶部",
        scrollToBottom: "滚动到底部",
        refreshPage: "刷新页面",
        reopenClosedTab: "重新打开标签页",
      };

      showNotification(gestureNames[gesture] || "手势已执行");
      gesturePerformed = true;
    }
  }
});

function drawArrow(x, y, direction, color) {
  const arrowSize = 20;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - direction * arrowSize, y - arrowSize / 2);
  ctx.lineTo(x - direction * arrowSize, y + arrowSize / 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawVerticalArrow(x, y, direction, color) {
  const arrowSize = 20;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - arrowSize / 2, y - direction * arrowSize);
  ctx.lineTo(x + arrowSize / 2, y - direction * arrowSize);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

const colorCache = new Map();
function hexToRgba(hex, alpha) {
  const cacheKey = `${hex}-${alpha}`;
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey);
  }

  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const result = `rgba(${r}, ${g}, ${b}, ${alpha})`;

  colorCache.set(cacheKey, result);
  return result;
}

document.addEventListener("contextmenu", (e) => {
  if (!extensionEnabled) return;

  if (gestureStarted || gesturePerformed) {
    e.preventDefault();
  }
  gestureStarted = false;
  gesturePerformed = false;
});

function recognizeGesture(path) {
  if (path.length < 5) {
    return null;
  }

  let totalDistance = 0;
  const distances = [];
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    distances.push(distance);
    totalDistance += distance;
  }

  if (totalDistance < settings.sensitivity * 2) {
    return null;
  }

  const pathLength = path.length;

  if (pathLength > 20 && settings.gestures.refreshPage) {
    if (detectCircularGesture(path)) {
      return "refreshPage";
    }
  }

  if (pathLength > 15 && settings.gestures.reopenClosedTab) {
    if (detectZShapeGesture(path)) {
      return "reopenClosedTab";
    }
  }

  let verticalDirection = 0;
  let horizontalDirection = 0;
  let isLShape = false;
  let verticalPhase = true;
  let maxVerticalDirection = 0;

  const smoothingWindow = Math.max(3, Math.floor(pathLength / 10));
  const step = Math.max(1, Math.floor(pathLength / 50));

  for (let i = smoothingWindow; i < pathLength; i += step) {
    const point = path[i];
    const prevPoint = path[i - smoothingWindow];
    const dx = point.x - prevPoint.x;
    const dy = point.y - prevPoint.y;

    if (Math.abs(dy) > Math.abs(dx)) {
      verticalDirection += dy > 0 ? 1 : -1;
      maxVerticalDirection = Math.max(
        maxVerticalDirection,
        Math.abs(verticalDirection)
      );
      if (!verticalPhase && Math.abs(verticalDirection) > 3) {
        isLShape = false;
        break;
      }
    } else {
      horizontalDirection += dx > 0 ? 1 : -1;
      if (verticalPhase && Math.abs(verticalDirection) > 3) {
        verticalPhase = false;
      }
    }

    if (!verticalPhase && maxVerticalDirection > 3 && horizontalDirection > 3) {
      isLShape = true;
    }
  }

  if (isLShape && settings.gestures.closeTab) {
    return "closeTab";
  }

  const minThreshold = Math.max(5, settings.sensitivity / 4);

  if (
    Math.abs(verticalDirection) > Math.abs(horizontalDirection) &&
    Math.abs(verticalDirection) > minThreshold
  ) {
    if (verticalDirection < 0 && settings.gestures.scrollToTop) {
      return "scrollToTop";
    } else if (verticalDirection > 0 && settings.gestures.scrollToBottom) {
      return "scrollToBottom";
    }
  }

  if (
    Math.abs(horizontalDirection) > Math.abs(verticalDirection) &&
    Math.abs(horizontalDirection) > minThreshold
  ) {
    if (horizontalDirection < 0 && settings.gestures.goBack) {
      return "goBack";
    } else if (horizontalDirection > 0 && settings.gestures.goForward) {
      return "goForward";
    }
  }

  return null;
}

function detectCircularGesture(path) {
  if (path.length < 20) return false;

  const centerX = path[Math.floor(path.length / 2)].x;
  const centerY = path[Math.floor(path.length / 2)].y;

  let angleSum = 0;
  let prevAngle = Math.atan2(path[0].y - centerY, path[0].x - centerX);

  const step = Math.max(1, Math.floor(path.length / 20));

  for (let i = step; i < path.length; i += step) {
    const angle = Math.atan2(path[i].y - centerY, path[i].x - centerX);
    let angleDiff = angle - prevAngle;

    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    angleSum += angleDiff;
    prevAngle = angle;
  }

  return Math.abs(angleSum) > Math.PI * 1.2;
}

function detectZShapeGesture(path) {
  if (path.length < 15) return false;

  const third = Math.floor(path.length / 3);
  const twoThirds = Math.floor((path.length * 2) / 3);

  const firstSegmentDx = path[third].x - path[0].x;
  const secondSegmentDx = path[twoThirds].x - path[third].x;
  const thirdSegmentDx = path[path.length - 1].x - path[twoThirds].x;

  const firstSegmentDy = path[third].y - path[0].y;
  const secondSegmentDy = path[twoThirds].y - path[third].y;
  const thirdSegmentDy = path[path.length - 1].y - path[twoThirds].y;

  const isZPattern =
    Math.abs(firstSegmentDx) > settings.sensitivity &&
    Math.abs(secondSegmentDy) > settings.sensitivity &&
    Math.abs(thirdSegmentDx) > settings.sensitivity &&
    firstSegmentDx * thirdSegmentDx > 0 &&
    Math.sign(firstSegmentDx) !== Math.sign(secondSegmentDx);

  return isZPattern;
}

let placeholderElement = null;
function createPlaceholder() {
  if (placeholderElement) return placeholderElement;

  placeholderElement = document.createElement("div");
  placeholderElement.style.position = "fixed";
  placeholderElement.style.top = "0";
  placeholderElement.style.left = "0";
  placeholderElement.style.width = "100%";
  placeholderElement.style.height = "100%";
  placeholderElement.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
  placeholderElement.style.zIndex = "9999998";
  placeholderElement.style.display = "none";
  placeholderElement.style.pointerEvents = "none";
  document.body.appendChild(placeholderElement);
  return placeholderElement;
}

document.addEventListener("dragstart", (e) => {
  if (!settings.dragLinks || !extensionEnabled) return;

  const target = e.target;
  const link = findLinkElement(target);
  if (link) {
    draggedLink = link;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const url = getLinkUrl(link);
    e.dataTransfer.setData("text/plain", url);
    createPlaceholder().style.display = "block";
  }
});

document.addEventListener("dragend", (e) => {
  if (!settings.dragLinks || !draggedLink || !extensionEnabled) return;

  const dragDistance = Math.sqrt(
    Math.pow(e.clientX - dragStartX, 2) + Math.pow(e.clientY - dragStartY, 2)
  );
  if (dragDistance > 10) {
    const url = getLinkUrl(draggedLink);
    if (url) {
      chrome.runtime.sendMessage(
        { action: "openNewTab", url: url },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
          }
        }
      );
      showNotification("新标签页已打开");
    }
  }
  draggedLink = null;
  createPlaceholder().style.display = "none";
});

document.addEventListener(
  "click",
  (e) => {
    if (!settings.ctrlClick || !extensionEnabled) return;

    if (e.ctrlKey || e.metaKey) {
      const target = e.target;
      const link = findLinkElement(target);
      if (link) {
        e.preventDefault();
        const url = getLinkUrl(link);
        if (url) {
          chrome.runtime.sendMessage(
            { action: "openNewTab", url: url },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error sending message:",
                  chrome.runtime.lastError
                );
              }
            }
          );
          showNotification("新标签页已打开");
        }
      }
    }
  },
  true
);

function findLinkElement(element) {
  while (element && element !== document.body) {
    if (
      element.tagName === "A" ||
      element.getAttribute("href") ||
      element.onclick
    ) {
      return element;
    }
    element = element.parentElement;
  }
  return null;
}

function getLinkUrl(element) {
  if (element.href) {
    return element.href;
  }
  const href = element.getAttribute("href");
  if (href) {
    return new URL(href, window.location.href).href;
  }
  const onclickStr = element.getAttribute("onclick");
  if (onclickStr) {
    const match = onclickStr.match(/window\.open\(['"]([^'"]+)['"]/);
    if (match) {
      return new URL(match[1], window.location.href).href;
    }
  }
  return null;
}

function loadSettings() {
  chrome.storage.sync.get(defaultSettings(), (items) => {
    settings = items;
    colorCache.clear();
    if (canvas) {
      createCanvas();
    }
  });
  // Extension enable state is read separately — it defaults to true and lives
  // outside the settings object (which holds gesture config only).
  chrome.storage.sync.get({ extensionEnabled: true }, (items) => {
    extensionEnabled = items.extensionEnabled !== false;
  });
}

let settingsUpdateTimeout;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "settingsUpdated") {
    clearTimeout(settingsUpdateTimeout);
    settingsUpdateTimeout = setTimeout(() => {
      settings = request.settings;
      colorCache.clear();
    }, 100);
    sendResponse({ received: true });
  } else if (request.action === "extensionToggled") {
    extensionEnabled = request.enabled;
    if (!extensionEnabled && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    showNotification(
      extensionEnabled ? "LiteMouse 已启用" : "LiteMouse 已禁用",
      "info"
    );
    sendResponse({ received: true });
  } else if (request.action === "scrollToTop") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    sendResponse({ received: true });
  } else if (request.action === "scrollToBottom") {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    sendResponse({ received: true });
  } else if (request.action === "showFriendlyMessage") {
    showNotification(request.message, "error");
    sendResponse({ received: true });
  }
});

function cleanup() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (canvas) {
    canvas.remove();
    canvas = null;
    ctx = null;
  }
  if (notificationElement) {
    notificationElement.remove();
    notificationElement = null;
  }
  colorCache.clear();
}

window.addEventListener("beforeunload", cleanup);

loadSettings();
createCanvas();
