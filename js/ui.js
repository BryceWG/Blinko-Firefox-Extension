// 显示状态信息
function showStatus(message, type = 'loading') {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        statusDiv.style.display = 'block';
    }
}

// 隐藏状态信息
function hideStatus() {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
}

// 显示成功图标
async function showSuccessIcon() {
    try {
        await browser.browserAction.setIcon({
            path: browser.runtime.getURL("images/icon128_success.png")
        });

        // 3秒后恢复原始图标
        setTimeout(async () => {
            try {
                await browser.browserAction.setIcon({
                    path: browser.runtime.getURL("images/icon128.png")
                });
            } catch (error) {
                console.error('恢复图标失败:', error);
            }
        }, 3000);
    } catch (error) {
        console.error('设置成功图标失败:', error);
    }
}

// 清空总结预览内容
function clearSummaryPreview() {
    const summaryPreview = document.getElementById('summaryPreview');
    const summaryText = document.getElementById('summaryText');
    const pageTitle = document.getElementById('pageTitle');
    const pageUrl = document.getElementById('pageUrl');

    if (summaryPreview) {
        summaryPreview.style.display = 'none';
    }
    if (summaryText) {
        summaryText.value = '';
    }
    if (pageTitle) {
        pageTitle.textContent = '';
    }
    if (pageUrl) {
        pageUrl.textContent = '';
    }
}

// 显示总结预览
async function showSummaryPreview(tempData) {
    if (tempData && tempData.summary) {
        document.getElementById('summaryPreview').style.display = 'block';
        document.getElementById('summaryText').value = tempData.summary;
        if (tempData.title) {
            document.getElementById('pageTitle').textContent = tempData.title;
        }
        if (tempData.url) {
            document.getElementById('pageUrl').textContent = tempData.url;
        }
    }
}

// 初始化UI事件监听器
function initializeUIListeners() {
    // 标签页切换
    document.querySelectorAll('.tablinks').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            
            // 更新按钮状态
            document.querySelectorAll('.tablinks').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // 更新内容显示
            document.querySelectorAll('.tabcontent').forEach(content => {
                content.style.display = 'none';
            });
            document.getElementById(tabName).style.display = 'block';
        });
    });

    // 密钥显示/隐藏
    document.querySelectorAll('.toggle-visibility').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input) {
                input.classList.toggle('visible');
                // 更新按钮图标
                this.textContent = input.classList.contains('visible') ? '🔒' : '👁️';
            }
        });
    });
}

export {
    showStatus,
    hideStatus,
    showSuccessIcon,
    clearSummaryPreview,
    showSummaryPreview,
    initializeUIListeners
}; 