// content.js
if (typeof JSZip === 'undefined') {
    console.error("JSZip failed to load! Please check if jszip.min.js is correctly included in manifest.json.");
}


// 截图逻辑
async function captureAndScroll() {
    const screenshots = [];
    const originalScrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    let currentScrollY = 0;

    // 滚动到顶部
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 200)); // 等待滚动完成

    while (currentScrollY < documentHeight) {
        // 1. 截图
        const dataUrl = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (response) => {
                // 确保 response 存在且 dataUrl 存在
                resolve(response && response.dataUrl);
            });
        });

        if (dataUrl) {
            screenshots.push(dataUrl);
        } else {
            console.warn(`第 ${screenshots.length + 1} 次截图失败，跳过。`);
        }

        // 2. 检查是否到达底部
        if (currentScrollY + windowHeight >= documentHeight) {
            break;
        }

        // 3. 滚动到下一屏
        currentScrollY += windowHeight;
        window.scrollTo(0, currentScrollY);
        await new Promise(resolve => setTimeout(resolve, 200)); // 等待滚动完成
    }

    // 恢复原始滚动位置
    window.scrollTo(0, originalScrollY);

    // 4. 打包下载
    const zip = new JSZip();

    // 检查是否有截图数据
    if (screenshots.length === 0) {
        console.error("没有捕获到任何截图。");
        // 可以给用户一个提示
        alert("截图失败，请确保网页内容可滚动或刷新页面重试。");
        return;
    }

    screenshots.forEach((dataUrl, index) => {
        // 确保 dataUrl 是有效的 base64 格式
        if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
            const base64Data = dataUrl.split(',')[1];
            zip.file(`screenshot_${index + 1}.png`, base64Data, { base64: true });
        } else {
            console.warn(`第 ${index + 1} 张截图数据无效，已跳过。`);
        }
    });

    zip.generateAsync({ type: "blob" })
        .then(function (content) {
            const url = URL.createObjectURL(content);

            // 获取网页标题，并清理文件名中不允许的字符
            let pageTitle = document.title.replace(/[\/\\:*?"<>|]/g, '_').trim();
            if (pageTitle === "") {
                pageTitle = "web_screenshots";
            }

            // 使用 a 标签直接在 content script 中下载，避免 blob url 跨域问题
            const a = document.createElement('a');
            a.href = url;
            a.download = `${pageTitle}_${new Date().toLocaleDateString().replace(/\//g, '-')}.zip`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();

            // 清理
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 1000);
        });
}

// 接收来自 background.js 的下载指令
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startCapture") {
        captureAndScroll();
        sendResponse({ status: "started" });
    }
});

// 注入 UI 按钮
function injectButton() {
    const button = document.createElement('button');
    button.id = 'manus-screenshot-button';
    button.textContent = '截图并下载';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '99999';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';

    button.onclick = () => {
        button.textContent = '正在截图...';
        button.disabled = true;
        captureAndScroll().finally(() => {
            button.textContent = '截图并下载';
            button.disabled = false;
        });
    };

    document.body.appendChild(button);
}

injectButton();