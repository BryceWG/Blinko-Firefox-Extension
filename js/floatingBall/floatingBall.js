// floatingBallState.js 内容
const ballState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    startRight: 0,
    startBottom: 0,
    isProcessing: false
};

function getState() {
    return ballState;
}

function updateState(newState) {
    Object.assign(ballState, newState);
    return ballState;
}

async function loadPosition() {
    try {
        const result = await chrome.storage.local.get('floatingBallPosition');
        return result.floatingBallPosition || {
            right: '20px',
            bottom: '20px'
        };
    } catch (error) {
        console.error('加载悬浮球位置失败:', error);
        return {
            right: '20px',
            bottom: '20px'
        };
    }
}

async function savePosition(position) {
    try {
        await chrome.storage.local.set({ floatingBallPosition: position });
    } catch (error) {
        console.error('保存悬浮球位置失败:', error);
    }
}

// floatingBallUI.js 内容
function createFloatingBallElement() {
    const ball = document.createElement('div');
    ball.id = 'blinko-floating-ball';
    
    const ballIcon = document.createElement('div');
    ballIcon.className = 'ball-icon';
    
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('images/icon128.png');
    img.alt = 'Blinko';
    
    const loadingCircle = document.createElement('div');
    loadingCircle.className = 'loading-circle';
    
    ballIcon.appendChild(img);
    ball.appendChild(ballIcon);
    ball.appendChild(loadingCircle);
    
    return ball;
}

function setFloatingBallPosition(ball, position) {
    Object.assign(ball.style, position);
}

function showLoadingState(ball, isRightClick = false) {
    ball.classList.add('processing');
    const loadingCircle = ball.querySelector('.loading-circle');
    if (loadingCircle) {
        if (isRightClick) {
            loadingCircle.classList.add('reverse');
        } else {
            loadingCircle.classList.remove('reverse');
        }
    }
}

function hideLoadingState(ball) {
    ball.classList.remove('processing');
}

function showSuccessState(ball) {
    ball.classList.remove('processing');
    ball.classList.add('success');
    const iconImg = ball.querySelector('img');
    iconImg.src = chrome.runtime.getURL('images/icon128_success_reverse.png');
}

function resetState(ball) {
    ball.classList.remove('success', 'processing');
    const iconImg = ball.querySelector('img');
    iconImg.src = chrome.runtime.getURL('images/icon128.png');
}

function removeFloatingBall() {
    const ball = document.getElementById('blinko-floating-ball');
    if (ball) {
        ball.remove();
    }
}

// floatingBallHandler.js 内容
function handleDragStart(e, ball) {
    const state = getState();
    if (state.isProcessing) return;
    
    updateState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY
    });
    
    const rect = ball.getBoundingClientRect();
    updateState({
        startRight: window.innerWidth - rect.right,
        startBottom: window.innerHeight - rect.bottom
    });
    
    ball.style.transition = 'none';
}

function handleDragMove(e, ball) {
    const state = getState();
    if (!state.isDragging) return;
    
    const deltaX = state.startX - e.clientX;
    const deltaY = state.startY - e.clientY;
    
    const newRight = state.startRight + deltaX;
    const newBottom = state.startBottom + deltaY;
    
    ball.style.right = newRight + 'px';
    ball.style.bottom = newBottom + 'px';
}

function handleDragEnd(ball) {
    const state = getState();
    if (!state.isDragging) return;
    
    updateState({ isDragging: false });
    ball.style.transition = 'transform 0.5s ease';
    
    // 保存新位置
    const position = {
        right: ball.style.right,
        bottom: ball.style.bottom
    };
    savePosition(position);
}

async function handleClick(ball, isRightClick = false) {
    const state = getState();
    if (state.isDragging || state.isProcessing) return;
    
    updateState({ isProcessing: true });
    showLoadingState(ball, isRightClick);

    try {
        // 获取页面内容
        const content = extractPageContent();
        const metadata = getPageMetadata();

        // 发送消息给background script处理
        const response = await chrome.runtime.sendMessage({
            action: 'processAndSendContent',
            content: content,
            title: metadata.title,
            url: metadata.url,
            isExtractOnly: isRightClick  // 添加标记表明是否仅提取内容
        });

        if (response && response.processing) {
            // 等待实际的响应
            return;  // background会处理剩余的流程
        } else {
            throw new Error('请求处理失败');
        }
    } catch (error) {
        console.error('处理内容时出错:', error);
        resetState(ball);
        updateState({ isProcessing: false });
        // 显示错误通知
        chrome.runtime.sendMessage({
            action: 'showNotification',
            type: 'error',
            title: '操作失败',
            message: error.message
        });
    }
}

function initializeEventListeners(ball) {
    // 处理拖拽
    ball.addEventListener('mousedown', e => {
        if (e.button === 0) { // 左键
            handleDragStart(e, ball);
        }
    });
    document.addEventListener('mousemove', e => handleDragMove(e, ball));
    document.addEventListener('mouseup', () => handleDragEnd(ball));

    // 处理点击
    ball.addEventListener('click', () => handleClick(ball, false));  // 左键点击
    ball.addEventListener('contextmenu', (e) => {
        e.preventDefault();  // 阻止默认右键菜单
        handleClick(ball, true);  // 右键点击
    });
}

// 主要逻辑
async function createFloatingBall() {
    try {
        // 检查是否启用悬浮球
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings || {};
        if (settings.enableFloatingBall === false) {
            return;
        }

        // 创建悬浮球元素
        const ball = createFloatingBallElement();

        // 从存储中获取位置
        const position = await loadPosition();
        setFloatingBallPosition(ball, position);

        // 添加到页面
        document.body.appendChild(ball);

        // 初始化事件监听器
        initializeEventListeners(ball);
    } catch (error) {
        console.error('创建悬浮球时出错:', error);
    }
}

function initializeMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateFloatingBallState') {
            const ball = document.getElementById('blinko-floating-ball');
            if (!ball) return;

            if (request.enabled === false) {
                removeFloatingBall();
            } else if (request.success !== undefined) {
                // 处理总结结果
                if (request.success) {
                    showSuccessState(ball);
                    // 3秒后恢复原状
                    setTimeout(() => {
                        resetState(ball);
                        updateState({ isProcessing: false });
                    }, 3000);
                } else {
                    resetState(ball);
                    updateState({ isProcessing: false });
                    // 可以考虑显示错误提示
                    console.error('总结失败:', request.error);
                }
            } else if (!document.getElementById('blinko-floating-ball')) {
                createFloatingBall();
            }
        }
    });
}

// 初始化
async function initialize() {
    initializeMessageListener();
    await createFloatingBall();
}

// 导出需要的函数
window.initialize = initialize;