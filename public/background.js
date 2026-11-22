// 点击工具栏图标：每次都在新标签页打开 JSON 工具，可以同时开多个。
const PAGE = chrome.runtime.getURL('app.html');

chrome.action.onClicked.addListener(async () => {
    await chrome.tabs.create({ url: PAGE });
});
