console.log('Content script loaded');

let isDrawing = false;
let startX, startY;
let path = [];
let canvas, ctx;
let gesturePerformed = false;
let gestureStarted = false; // 新增变量，用于跟踪手势是否开始
let minGestureDistance = 20; // 新增：定义最小手势距离

// 创建canvas元素用于显示鼠标手势路径
function createCanvas() {
  canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999999';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.scale(dpr, dpr);
}

// 绘制鼠标手势路径
function drawPath() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  path.forEach(point => {
    ctx.lineTo(startX + point.x, startY + point.y);
  });
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // 更改为不太透明的红色
  ctx.lineWidth = 4; // 增加线条宽度
  ctx.lineCap = 'round'; // 添加圆形线帽，使线条末端更圆滑
  ctx.lineJoin = 'round'; // 使线条连接处更圆滑
  ctx.stroke();

  // 绘制箭头
  if (path.length > 10) {
    const lastPoint = path[path.length - 1];
    const prevPoint = path[path.length - 11]; // 使用10个点之前的点来确定方向
    const dx = lastPoint.x - prevPoint.x;
    const dy = lastPoint.y - prevPoint.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平移动
      const arrowDirection = dx > 0 ? 1 : -1;
      drawArrow(startX + lastPoint.x, startY + lastPoint.y, arrowDirection);
    }
  }
}

// 绘制箭头
function drawArrow(x, y, direction) {
  const arrowSize = 20;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - direction * arrowSize, y - arrowSize / 2);
  ctx.lineTo(x - direction * arrowSize, y + arrowSize / 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
  ctx.fill();
}

document.addEventListener('mousedown', (e) => {
  console.log('Mouse down event', e.button);
  if (e.button === 2) {
    isDrawing = true;
    gestureStarted = false; // 初始化为 false
    gesturePerformed = false;
    startX = e.clientX;
    startY = e.clientY;
    path = [];
    console.log('Right click detected, starting gesture');
    e.preventDefault();
  }
});

document.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const newPoint = { x: e.clientX - startX, y: e.clientY - startY };
  path.push(newPoint);
  
  // 检查是否移动了足够的距离来认为手势已开始
  if (!gestureStarted && (Math.abs(newPoint.x) > minGestureDistance || Math.abs(newPoint.y) > minGestureDistance)) {
    gestureStarted = true;
    console.log('Gesture started');
  }
  
  console.log('Mouse move', path.length);
  drawPath();
});

document.addEventListener('mouseup', (e) => {
  console.log('Mouse up event');
  if (!isDrawing) return;
  isDrawing = false;
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (gestureStarted) {
    const gesture = recognizeGesture(path);
    console.log('Gesture recognition result:', gesture);
    if (gesture) {
      console.log('Gesture recognized:', gesture);
      chrome.runtime.sendMessage({ action: gesture }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
        } else {
          console.log('Response from background:', response);
        }
      });
      gesturePerformed = true;
    }
  }
  
  // 不需要重置 gestureStarted，因为 contextmenu 事件会在 mouseup 之后触发
});

// 修改阻止默认右键菜单的逻辑
document.addEventListener('contextmenu', (e) => {
  if (gestureStarted || gesturePerformed) {
    e.preventDefault();
    console.log('Context menu prevented');
  }
  // 重置状态
  gestureStarted = false;
  gesturePerformed = false;
});

function recognizeGesture(path) {
  console.log('Recognizing gesture, path length:', path.length);
  if (path.length < 10) {
    console.log('Path too short, ignoring');
    return null;
  }

  let verticalDirection = 0;
  let horizontalDirection = 0;
  let isLShape = false;
  let verticalPhase = true;
  let maxVerticalDirection = 0;

  for (let i = 1; i < path.length; i++) {
    const point = path[i];
    const prevPoint = path[i - 1];
    const dx = point.x - prevPoint.x;
    const dy = point.y - prevPoint.y;

    if (Math.abs(dy) > Math.abs(dx)) {
      // 垂直移动
      verticalDirection += dy > 0 ? 1 : -1;
      maxVerticalDirection = Math.max(maxVerticalDirection, Math.abs(verticalDirection));
      if (!verticalPhase && Math.abs(verticalDirection) > 5) {
        // 如果在水平阶段又开始明显的垂直移动，取消L型识别
        isLShape = false;
        break;
      }
    } else {
      // 水平移动
      horizontalDirection += dx > 0 ? 1 : -1;
      if (verticalPhase && Math.abs(verticalDirection) > 5) {
        verticalPhase = false;
      }
    }

    // 检查是否形成了L型
    if (!verticalPhase && maxVerticalDirection > 5 && horizontalDirection > 5) {
      isLShape = true;
    }
  }

  console.log('Vertical direction:', verticalDirection, 'Horizontal direction:', horizontalDirection, 'Is L shape:', isLShape);

  // 首先检查是否是L型
  if (isLShape) {
    console.log('L shape detected (down then right)');
    return "closeTab";
  }

  // 然后检查水平移动
  if (Math.abs(horizontalDirection) > Math.abs(verticalDirection) && Math.abs(horizontalDirection) > 10) {
    const result = horizontalDirection < 0 ? "goBack" : "goForward";
    console.log('Horizontal movement detected:', result);
    return result;
  }

  console.log('No gesture recognized');
  return null;
}

// 在文件顶部添加新的变量
let draggedLink = null;

// 在 createCanvas() 函数之后添加以下新函数
function createPlaceholder() {
  const placeholder = document.createElement('div');
  placeholder.style.position = 'fixed';
  placeholder.style.top = '0';
  placeholder.style.left = '0';
  placeholder.style.width = '100%';
  placeholder.style.height = '100%';
  placeholder.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
  placeholder.style.zIndex = '9999998';
  placeholder.style.display = 'none';
  placeholder.style.pointerEvents = 'none';
  document.body.appendChild(placeholder);
  return placeholder;
}

const placeholder = createPlaceholder();

// 在 createCanvas() 函数调用之后添加以下事件监听器
document.addEventListener('dragstart', (e) => {
  const link = e.target.closest('a');
  if (link) {
    draggedLink = link;
    e.dataTransfer.setData('text/plain', link.href);
    placeholder.style.display = 'block';
    console.log('Drag started:', link.href); // 添加日志
  }
});

document.addEventListener('dragover', (e) => {
  if (draggedLink) {
    e.preventDefault();
  }
});

document.addEventListener('dragend', (e) => {
  if (draggedLink) {
    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - e.screenX, 2) + Math.pow(e.clientY - e.screenY, 2)
    );
    console.log('Drag ended. Distance:', dragDistance); // 添加日志
    if (dragDistance > 10) { // 如果拖动距离大于10像素
      console.log('Sending openNewTab message'); // 添加日志
      chrome.runtime.sendMessage({ action: "openNewTab", url: draggedLink.href }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
        } else {
          console.log('Response from background:', response);
        }
      });
    }
    draggedLink = null;
    placeholder.style.display = 'none';
  }
});

// 添加一个新的事件监听器来处理拖放
document.addEventListener('drop', (e) => {
  e.preventDefault(); // 防止默认的拖放行为
  console.log('Drop event occurred'); // 添加日志
});

createCanvas();
console.log('Canvas created');