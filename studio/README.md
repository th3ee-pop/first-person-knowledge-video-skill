# Studio：每日心理学短视频模板

竖屏 1080×1920 的知识短视频，只有字幕和音乐，没有旁白，每条同时出中文版和英文版。画面用 Three.js 在无头 Chrome 里逐帧渲染。片中在两种空间之间一镜到底地切换：

- 写实的生活场景：**画面里没有人**。先看空房间，再进入第一人称视角（观众就是"你"），看到桌上的手机、闹钟、窗外的楼。道具和材质来自 Poly Haven；
- 抽象的心理结构：虚空舞台上的几何体。

人物模型（Rocketbox）仍然可以用，但默认不用：3D 人物的年龄和气质很难贴合观众，物件和意象更有余味。

## 每天出一条片

```bash
node tools/new-episode.mjs 001-xxx "标题"
```

1. **建集。** 运行上面的命令。它会生成 `episodes/001-xxx/`，里面有 `episode.json`、`subs.json`、`scene.js`、`score.py` 和 `copy/brief.md`。
2. **文案。** 填好 `copy/brief.md` 里的【】，交给 Argon 起稿：
   ```bash
   agy -p "$(cat episodes/001-xxx/copy/brief.md)" --model gemini-4-argon-high --output-format text --print-timeout 280s > episodes/001-xxx/copy/argon_raw.txt
   ```
   拿到草稿后人工核对：学术说法是否准确、有没有黑话或元信息、每行是否不超过 13 字，英文是否自然、够短。改好后写进 `subs.json`，并把 `title_en` 填进 `episode.json`。
3. **素材。** 在 `episode.json` 的 `assets` 里列出要用的模型和动作，然后运行 `node tools/fetch-assets.mjs 001-xxx`。素材下载到共享缓存 `assets/`，已有的会跳过。
   - 不知道素材叫什么名字，可以先搜：`node tools/fetch-assets.mjs --search phone`。
4. **场景。** 编辑 `scene.js`，用房间、道具、人物、结构、镜头和氛围来编排（写法见下文 API）。
5. **检查画面。**
   - `node tools/render.mjs still 001-xxx 6` 渲染单帧，输出 `out/still_6.png`；
   - `node tools/render.mjs contact 001-xxx 1.5` 生成整片缩略图 `out/sheet_N.jpg`；
   - 两条命令都可以加 `--lang en` 看英文字幕。
   - 逐张看：构图、穿模、过曝或过暗、转场途中有没有空镜。
6. **配乐。** 编辑 `score.py`。时间统一用 `s.T('S2', 0)`，这样字幕时长变了，音乐也会自动对齐。
7. **成片。** `node tools/render.mjs video 001-xxx` 输出 `out/<标题>.mp4`；只要每屏都有 `en`，还会同时输出 `out/<title_en>.mp4`。3D 画面每帧只渲染一次，两种语言只是换一层字幕，所以双语几乎不增加耗时。帧渲染和配乐合成并行进行，响度归一到 −16 LUFS。

`episodes/000-demo` 是一条完整的 30 秒双语示范片（无人物、第一人称），新集可以照着它写。

## 双语字幕

`subs.json` 的每屏写成 `{"text": "中文", "en": "English", "sec": 3.4}`，注释小字写成 `small` / `small_en`。两种语言共用同一套时长，所以英文要短：每屏不超过约 14 个单词，最多两行。英文字幕用 Baskerville 字体，左右各留 90px，过长会自动换行。

## 时间轴

字幕决定一切时间：

- 每屏时长 = `sec × scale`；
- 片头先留 `lead` 秒，片尾再留 `tail` 秒；
- `T('S2', 1)` 和 `E('S2', 1)` 分别是第 S2 段第 2 屏的开始和结束时间（秒）。

画面、镜头和配乐都只引用这两个函数，所以改文案不用改别处。

**有旁白时，时间轴由旁白决定。** `node tools/voice.mjs <ep>` 合成旁白后会写出 `episodes/<ep>/timeline.json`：每屏时长 = 中英两段配音里较长的那段 + `gap`（`episode.json` 里设，默认 0.45 秒）；只有一种语言的旁白时就按那一种算。引擎和 `synth.py` 发现 `timeline.json` 就用它，没有就走上面的 `sec × scale`。所以：

- 改了文案，要重跑 `voice.mjs`（只重新合成改过的那几屏），否则 `timeline.json` 和 `subs.json` 对不上，引擎会报错；
- 想回到 `sec × scale`，删掉 `timeline.json` 即可；
- 时长的计算在 `tools/timeline.mjs` 的 `buildTimeline(ep, subs, voice)`，引擎、`voice.mjs` 共用（`node --test tools/*.test.mjs` 跑测试）。

## 旁白（豆包语音合成 2.0）

把 key 填进 `studio/.env` 的 `DOUBAO_API_KEY`（模板见 `.env.example`，不要贴到别处）。`DOUBAO_TTS_RESOURCE_ID` 默认 `seed-tts-2.0`，音色写在 `DOUBAO_VOICE_ZH` / `DOUBAO_VOICE_EN`。

```bash
node tools/voice.mjs 001-xxx --voice <音色> --sample "一段文字" --out episodes/001-xxx/out/audition/<名字>.mp3   # 试听，不写别的文件
node tools/voice.mjs 001-xxx                 # 两种语言（各自需要音色）
node tools/voice.mjs 001-xxx --lang zh       # 只做中文
```

- 念的就是字幕：去掉换行，中文直接拼接，英文用空格拼接。`small` 小字不念。所以每屏的中文连起来要读得通，需要停顿的地方写出标点。
- 产出：`voice/<lang>/<段>_<屏>.mp3`（句组为 `<段>_<首屏>-<末屏>.mp3`）、`voice/manifest.json`（每屏或每组的文字哈希、音色、时长）、`timeline.json`、`out/voice_<lang>.wav`（各屏在开始后 0.15 秒起念，整轨与全片等长）。
- **一句话跨屏：** 在 `subs.json` 里给前面的屏标 `"cont": true`（不能标在一段的最后一屏），它和下一屏组成一个「句组」，文字拼起来一次合成、一口气念完，文件是 `voice/<lang>/<段>_<首屏>-<末屏>.mp3`。句组时长 = 中英两段里较长的那段 + `gap`；组内换屏点：每种语言用 `silencedetect` 找停顿（停顿数正好等于标点数时按标点顺序对上，否则取离按字数估算的位置最近的停顿，找不到就用估算），两种语言取平均，所以跨屏的地方屏尾最好落在标点上。运行时会逐组打印中英时长和换屏点（`mark` / `pause` / `est`）。
- 文字和音色都没变的屏（句组）直接复用；某一组失败时会报出是哪一组，以非零状态退出，不写 `timeline.json`。
- `render.mjs video` 发现 `out/voice_<lang>.wav` 就把旁白混进去：配乐先压到 0.55，再以旁白为侧链压缩（有人声时约再低 9 dB），最后整体归一到 −16 LUFS。有旁白的集只出有旁白轨的语言，缺的那种会打印提示。
- 我们听不到声音：每次合成后看一眼它打印的每屏时长（过短或超过 7 秒会提醒），读音和语气要人来抽查。

## scene.js API

`export default async function build(S)` 返回 `{ shots, mood(t), update(t) }`。

### 写实世界

| 调用 | 作用 |
|---|---|
| `await S.hdri(name, i?)` | 环境光（Poly Haven HDRI） |
| `S.room({ w, d, h, floor, wall, wallTint, window:{x,y,w,h} })` | 剖面房间：地板、后墙（−z，带窗）、左墙（−x）。返回 `backZ`、`leftX`、`sky`、`floor` |
| `await S.prop(name, { pos, rotY, scale, on, parent })` | Poly Haven 模型，原点在底面中心。`on: desk` 时放在 desk 顶面，`pos` 的 x/z 相对 desk。尺寸见 `obj.userData.size` |
| `S.pbr(name, repeat, { tint })` | Poly Haven PBR 材质，给自己捏的几何体用 |
| `S.lamp(pos, target, { intensity })` | 暖色台灯光，返回 `set(v)`。第一人称近景里 intensity 约 1 就够，太亮桌面会过曝 |
| `S.phone({ pos, rotY })` | 平放的智能手机，屏幕上是滚动的信息流。`.set({ scroll, on })`，scroll 持续增大就一直在刷 |
| `await S.person(avatar, { rotY, seat, pos, clips, faceLight })` | Rocketbox 真人（默认不用） |
| `S.seatOf(chair)` | 椅子的骨盆落点 |

`S.person` 的要点（仅在确实需要人物时）：

- `clips` 写成 `[[t, 动作名, 淡入秒], …]`，从时间 t 起交叉淡入该动作。所有角色共用 Bip01 骨骼，任何动作都能套到任何人身上。
- `rotY: Math.PI` 表示面朝 −z。
- `me.head()` 返回头部的世界坐标，可以直接当镜头目标。

### 抽象结构（`S.kit.*`）

| 调用 | 作用 |
|---|---|
| `voidStage({ y })` | 地面以下的深色舞台，返回 `group`、`setLight(v)` |
| `glassCube(size, { parent })` | 玻璃立方体，方法有 `open(v)`、`glow(v)`、`tint(v)` |
| `blockGrid({ parent, n, hole, size, gap })` | 方块阵，`.update(t, { rain, chaos, gone })`，单个方块在 `.blocks[i]` |
| `ribbon(points)` | 发光的线，方法有 `show(a, b)`、`at(u)` |
| `bead()` | 光点，`.set(pos, visible, intensity)` |
| `stars()` | 星空 |

### 2D 讲解图层（`S.overlay.*`）

讲理论时把 3D 画面压暗、虚化，在上面画线稿、贴纸片和照片。图层是 DOM，放在字幕下面；里面的文字按当前语言切换，所以 3D 画面仍然只渲染一遍。坐标是 1080×1920 的像素，**一律放在 y < 1300 的区域**，下面是字幕。所有动画都是时间的函数（逐帧截图渲染，不能用 CSS transition）。

| 调用 | 作用 |
|---|---|
| `dim(at, out, amount = 0.55)` | 这段时间把 3D 画面压暗并虚化，进出各 0.6 秒 |
| `stroke({ at, out, d, draw = 1.2, color, width = 4, glow = true })` | 发光线稿。`d` 是 SVG 路径，从 `at` 起用 `draw` 秒画出来，`out` 前 0.5 秒淡出 |
| `label({ at, out, x, y, zh, en, size = 44, font = 'song', color, anchor = 'middle' })` | 一行字。`(x, y)` 是锚点（垂直居中）；`font: 'song'` 衬线（同字幕），`'sans'` 无衬线 |
| `paper({ at, out, x, y, w, h, rot, src, zh, en, … })` | 带纸纹和投影的纸片，以 `(x, y)` 为中心。给 `src` 贴图片（相对集目录），否则写 `zh`/`en` 文字。可选 `size`、`font`、`color`、`align`、`pad`、`ruled: true`（卷子横线）、`stamp: { at, zh, en, color, rot, size, right, bottom }`（在 `at` 时盖下的章；`right`/`bottom` 是章在纸片内的 CSS 偏移，默认 `8%`/`10%`，纸片小时把章往角上推，免得压住字）。进场 0.5 秒淡入加轻微下落 |
| `photo({ at, out, x, y, w, rot, src })` | 抠好的透明底照片（自动去色、加投影），进场同 `paper` |

`rot` 的单位是度。引擎每帧调用 `S.overlay.update(t, lang)`，`window.subsAt(t)` 也会调用它，所以换语言时图层文字跟着换。图片在第一帧之前全部解码完。

### 镜头

`pov(at, eye, look, fov = 40, moveDur)`：第一人称机位。眼睛在 `eye`，看向 `look`。停留时眼睛不动，只有轻微的呼吸感，视线缓慢游移；两个 `pov` 之间切换就是"转头"。坐在书桌前的眼睛高度约 1.17 m。

`shot(at, target, dist, dir, fov, moveDur)`：在第 `at` 秒到达机位。

- `target` 可以是坐标，也可以是函数（例如 `() => me.head()`，跟着人动）；
- 镜头位置 = `target + normalize(dir) × dist`；
- 两个机位之间走 Catmull-Rom 曲线，移动时自动虚焦，停留时缓慢推近并微微绕行。

几条经验：

- 典型的一镜到底：空房间远景 → 飞进第一人称（`pov`）→ 退回远景 → 潜入虚空 → 升回远景 → 再坐回第一人称。
- 从第一人称去虚空、或从虚空回第一人称，中间都要经过一个远景机位（dist ≥ 7）。镜头要从房间外进出，否则会穿过书桌或地板。

### 氛围

`mood(t)` 返回各氛围的权重，引擎会把它们混合起来。可选的氛围有：`night`、`focus`、`void`、`space`、`dawn`、`day`。`dawn` 的权重还会同时控制窗外天空的颜色。

## 配乐（music/synth.py）

- **乐器：** `piano`、`pluck`、`bell`、`musicbox`、`marimba`、`pad`、`tick`、`sweep`、`thud`、`shutter`、`keyclick`、`heartbeat`。
- **编排：** `s.arp(和弦列表, 起点)` 写分解和弦，`s.melody([(音名, 拍, 时值)], 起点)` 写旋律，`s.add(信号, 时间, pan, gain)` 放置单个声音。
- 所有声音都是合成出来的，不存在版权问题。

## 素材与许可

全部素材都可以商用，详见 `assets/LICENSES.md`。

- Microsoft Rocketbox：MIT 许可，提供 115 个角色和上千个动作。
- Poly Haven：CC0，模型、材质和 HDRI 都可以用。

## 常见问题

- **第一人称画面发白：** 灯离桌面太近、太亮。降低 `S.lamp` 的 intensity，手机自带的光已经很弱。
- **人物发白或发黑：** 贴图没有加载。检查 `assets/rocketbox/avatars/<名字>/textures/`。其中 opacity 贴图必须是带 alpha 通道的 PNG，`fetch-assets` 会自动处理。
- **道具悬空或穿模：** 用 `on:` 放置，用 `userData.size` 计算位置，不要手写高度。
- **画面全黑或报错：** 用 `still` 渲染时，页面里的报错会打印在终端。
- **`timeline.json has no card …`：** 改了 `subs.json` 的屏数但没重跑 `voice.mjs`。重跑，或删掉 `timeline.json`。
