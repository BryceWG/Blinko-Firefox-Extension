import { showStatus } from './ui.js';

// 保存快捷记录内容
function saveQuickNote() {
    const input = document.getElementById('quickNoteInput');
    if (input && input.value.trim()) {
        browser.storage.local.set({ 'quickNote': input.value });
    }
}

// 更新附件列表显示
function updateAttachmentList(attachments) {
    const attachmentItems = document.getElementById('attachmentItems');
    const clearAttachmentsBtn = document.getElementById('clearAttachments');
    
    // 清空现有内容
    attachmentItems.innerHTML = '';
    
    // 如果有附件，显示清除按钮
    clearAttachmentsBtn.style.display = attachments.length > 0 ? 'block' : 'none';

    // 添加附件项
    attachments.forEach((attachment, index) => {
        const item = document.createElement('div');
        item.className = 'attachment-item';
        
        // 创建图片预览
        const img = document.createElement('img');
        img.src = attachment.path;  // 使用附件的路径
        img.alt = attachment.name;
        item.appendChild(img);
        
        // 创建删除按钮
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-button';
        removeBtn.innerHTML = '×';
        removeBtn.title = '移除附件';
        removeBtn.onclick = () => removeAttachment(index);
        item.appendChild(removeBtn);
        
        attachmentItems.appendChild(item);
    });
}

// 移除单个附件
async function removeAttachment(index) {
    try {
        const result = await browser.storage.local.get('quickNoteAttachments');
        let attachments = result.quickNoteAttachments || [];
        
        // 移除指定索引的附件
        attachments.splice(index, 1);
        
        // 保存更新后的附件列表
        await browser.storage.local.set({ 'quickNoteAttachments': attachments });
        
        // 更新显示
        updateAttachmentList(attachments);
    } catch (error) {
        console.error('移除附件失败:', error);
        showStatus('移除附件失败: ' + error.message, 'error');
    }
}

// 清除所有附件
async function clearAttachments() {
    try {
        await browser.storage.local.remove('quickNoteAttachments');
        updateAttachmentList([]);
    } catch (error) {
        console.error('清除附件失败:', error);
        showStatus('清除附件失败: ' + error.message, 'error');
    }
}

// 加载快捷记录内容
async function loadQuickNote() {
    try {
        // 加载文本内容和附件
        const result = await browser.storage.local.get(['quickNote', 'quickNoteAttachments']);
        if (result.quickNote) {
            document.getElementById('quickNoteInput').value = result.quickNote;
        }
        
        // 加载并显示附件
        if (result.quickNoteAttachments && result.quickNoteAttachments.length > 0) {
            updateAttachmentList(result.quickNoteAttachments);
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
        browser.storage.local.remove(['quickNote', 'quickNoteAttachments']);
        // 更新附件列表显示
        updateAttachmentList([]);
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

        // 获取当前标签页信息
        let url = '';
        let title = '';
        try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                url = tab.url;
                title = tab.title;
            }
        } catch (error) {
            console.error('获取当前标签页信息失败:', error);
        }

        // 获取附件列表
        const attachmentsResult = await browser.storage.local.get(['quickNoteAttachments']);
        const attachments = attachmentsResult.quickNoteAttachments || [];

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
                content: content.trim(),
                url: url,
                title: title,
                attachments: attachments
            });
        });

        // 等待响应
        const response = await responsePromise;

        if (response && response.success) {
            showStatus('发送成功', 'success');
            // 发送成功后清除内容和存储
            input.value = '';
            await browser.storage.local.remove(['quickNote', 'quickNoteAttachments']);
            // 清空附件列表显示
            updateAttachmentList([]);
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
    document.getElementById('clearAttachments').addEventListener('click', clearAttachments);
}

export {
    saveQuickNote,
    loadQuickNote,
    clearQuickNote,
    sendQuickNote,
    initializeQuickNoteListeners,
    updateAttachmentList
};