<img width="192" height="192" alt="1000016604" src="https://github.com/user-attachments/assets/f1436dbd-1746-42a6-9eb7-3852ced5d334" />

# LRStudy

本地优先的错题整理与复习工具。网页版可直接使用，Android 提供 APK。

在线体验：https://lightrainx.github.io/LRStudy-web  
作者主页：https://github.com/LightRainx

## 功能

- 拍照或相册导入错题，自动框题，也可手动补框
- 可选本地 OCR（RapidOCR / ONNX Runtime），识别印刷题目文字
- 错题本、知识点、备注、掌握状态管理
- 可选 AI 解析，兼容 OpenAI Chat Completions 接口
- 按常错知识点生成练习卷，支持题量、备注、学年段限制
- 生成后可在设备上答题，提交 AI 批改
- 导出 A4 PDF、打印、拍照批改
- WebDAV、内网同步、公网同步
- 本地 ZIP 备份/恢复

## 使用

1. 打开在线体验地址
2. 新建错题本，收录第一道题
3. 需要 AI 时，在设置中填写接口、Key 和模型；不配置也能正常整理错题
4. 在复习页生成练习卷

Android APK 见仓库 Releases（如果已发布）。  
iOS 使用 Safari 网页版；打印走 PDF 分享/文件路径，不能作为同步主机。

## 数据与隐私

错题、图片、解析和练习记录默认保存在本机 IndexedDB 中，不依赖 LRStudy 账户。

只有主动配置 AI、WebDAV 或发起同步时数据才会外发。公网同步使用 AES-GCM 加密，密钥放在链接的 `#` 片段中，不同步 API Key 和 WebDAV 密码。

建议定期导出 ZIP 备份。

## 已知限制

- iOS 网页版不能作为同步主机
- 公网同步依赖 PeerJS 公共信令，网络不稳定时可能连不上
- 公网同步入口需要先部署 v1.6 页面的 HTTPS 地址
- OCR 对手写、公式和复杂版式效果有限
- Android 原生打印和内网同步尚未在所有机型上验证
---------------
我承认这是AI写的，所以说写这个所谓README意义是什么，就像大部分玩GitHub的，去找个发行版下完就走:(
