<img width="1600" height="640" alt="banner" src="https://github.com/user-attachments/assets/d672a1aa-8c7a-4f36-88a7-45b51038d27b" />

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness) [![](https://img.shields.io/badge/Telegram-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://t.me/lrstudy) ![Sync](https://img.shields.io/badge/sync-WebDAV%20%7C%20P2P-111111?style=flat-square)
> **一个错题整理工具，让你的学习井井有条**

在线体验：https://lightrainx.github.io/LRStudy-web  
作者主页：https://github.com/LightRainx

# 功能

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
## 免责声明
①本软件仅供学习使用，已使用MIT协议开源，请勿用于违法或商业用途
②代码基本为AI所写，本人中学生没有能力和精力创作一个App
③该软件本意是公开共享，如有触及法律或侵权请告知！

