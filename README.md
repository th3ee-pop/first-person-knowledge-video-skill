# 竖屏知识短视频生产线

用程序做竖屏知识短视频：3D 立体小场景一镜到底，加字幕和合成的原创配乐，可选中文、英文或双语，可选豆包语音旁白。配套一个 Claude Code skill，把整个流程和风格标准写了下来。

- `.claude/skills/vibe-knowledge-video/`：skill。在这个文件夹里打开 Claude Code，说"做一条关于……的视频"就会用上它。
- `studio/`：生产线（Three.js 引擎、渲染和配音工具、配乐合成器、模板）。API 见 `studio/README.md`。
- `studio/episodes/001-exam-dream/`：样片《考试的梦》的全部源文件（文案、场景、配乐脚本）。
- `CLAUDE.md`：项目说明和风格标准。

## 准备环境

需要 macOS 上的 Node.js、Python 3（带 numpy 和 Pillow）、ffmpeg、Google Chrome。

```bash
cd studio && npm install
```

```bash
cd studio && node tools/fetch-assets.mjs 001-exam-dream
```

要旁白的话，把 `studio/.env.example` 复制成 `studio/.env`，填上豆包语音的 API Key 和音色。`.env` 不进仓库。

## 仓库里没有的东西

密钥、渲染出来的视频、配音音频、下载的 3D 素材缓存和 `node_modules` 都不在仓库里，按上面的步骤可以重新生成。第 1 集的旁白需要重跑 `node tools/voice.mjs 001-exam-dream` 才能渲染出带旁白的版本。

## 素材许可

3D 模型和材质来自 Poly Haven（CC0），详见 `studio/assets/LICENSES.md`。配乐全部由 `studio/music/synth.py` 合成。
