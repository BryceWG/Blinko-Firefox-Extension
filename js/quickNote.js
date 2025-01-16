import { showStatus } from './ui.js';

// 保存快捷记录内容
function saveQuickNote() {
    const input = document.getElementById('quickNoteInput');
    if (input && input.value.trim()) {
        browser.storage.local.set({ 'quickNote': input.value });
    }
}

// 加载快捷记录内容
async function loadQuickNote() {
    try {
        const result = await browser.storage.local.get('quickNote');
        if (result.quickNote) {
            document.getElementById('quickNoteInput').value = result.quickNote;
        }
    } catch (error) {
        console.error('加载快捷记录失败:', error);
    }
}

// 清除快捷记录内容
function clearQuickNote() {
    const input = document.getElementById('quickNoteInput');
    if (input) {
        input.value = '';
        // 清除storage中的数据
        browser.storage.local.remove('quickNote');
    }
}

// 发送快捷记录
async function sendQuickNote() {
    try {
        const input = document.getElementById('quickNoteInput');
        const content = input.value;
        if (!content.trim()) {
            showStatus('请输入笔记内容', 'error');
            return;
        }

        const result = await browser.storage.sync.get('settings');
        const settings = result.settings;
        
        if (!settings) {
            throw new Error('未找到设置信息');
        }

        showStatus('正在发送...', 'loading');

        // 发送消息并等待saveSummaryResponse
        const responsePromise = new Promise((resolve) => {
            const listener = (message) => {
                if (message.action === 'saveSummaryResponse') {
                    browser.runtime.onMessage.removeListener(listener);
                    resolve(message.response);
                }
            };
            browser.runtime.onMessage.addListener(listener);
            
            // 发送请求
            browser.runtime.sendMessage({
                action: 'saveSummary',
                type: 'quickNote',
                content: content.trim()
            });
        });

        // 等待响应
        const response = await responsePromise;

        if (response && response.success) {
            showStatus('发送成功', 'success');
            // 发送成功后清除内容和存储
            input.value = '';
            await browser.storage.local.remove('quickNote');
        } else {
            showStatus('发送失败: ' + (response?.error || '未知错误'), 'error');
        }
    } catch (error) {
        showStatus('发送失败: ' + error.message, 'error');
    }
}

// 初始化快捷记录相关的事件监听器
function initializeQuickNoteListeners() {
    document.getElementById('quickNoteInput').addEventListener('input', saveQuickNote);
    document.getElementById('sendQuickNote').addEventListener('click', sendQuickNote);
    document.getElementById('clearQuickNote').addEventListener('click', clearQuickNote);
}

export {
    saveQuickNote,
    loadQuickNote,
    clearQuickNote,
    sendQuickNote,
    initializeQuickNoteListeners
}; 