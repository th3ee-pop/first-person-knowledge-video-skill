# 引擎补充说明

`studio/README.md` 的 API 表没有写到下面这些，它们是做 `001-exam-dream` 时加的。写法以 `episodes/001-exam-dream/scene.js` 为例。

## 纯色风格（现行标准）

- `S.room({ floorColor, wallColor, wallColor2, trimColor, skyPalette, … })`：给了 `wallColor` / `floorColor`（十六进制颜色）就用纯色哑光材质，不再加载贴图。`trimColor` 是窗框和踢脚线，`skyPalette` 改窗外天空的配色。
- Poly Haven 的道具自带写实贴图。加载后把材质换成一个纯色：
  ```js
  const matte = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0 });
  const flat = (obj, c) => { const m = matte(c); obj.traverse(o => { if (o.isMesh) o.material = m; }); return obj; };
  const bed = flat(await S.prop('old_bed_frame', { pos: [x, 0, z] }), 0xf1b7a6);
  ```
- `S.look({ scrim, vignette, subColor, subShadow, smallColor, grain, fade, flash, rule })`：改字幕底的渐变、暗角、字幕颜色、颗粒、淡入淡出色等，值都是 CSS。亮色画面要把 `grain` 设为 0，并给字幕配一个同色系的深色底。
- 氛围配色：在 scene.js 顶部 `import { shot, pov, MOODS } from '/engine/studio.js'`，然后 `Object.assign(MOODS, { night: {...}, dream: {...} })` 覆盖或新增。
- `S.overlay.theme({ ink, labelShadow, paperShadow, photoFilter, stamp, dimTint, dimDarken, dimBlur, chipShadow })`：2D 图层的配色，要在创建图层元素之前调用。

## 2D 图层的新选项

- `label` 和 `paper` 接受 `pos: t => [x, y]`，可以把文字或纸片钉在一个投影到屏幕上的 3D 点上，跟着镜头走。
- `label` 接受 `bg`（文字放在圆角色块上）和 `rot`（角度）。
- `S.overlay.stamp({ at, out, x, y, pos, zh, en, color, size, rot, fill })`：单独的一枚印章，在 `at` 时盖下。

2D 图层现在只做点缀（标签、印章、一张纸）。不要用它代替场景。

## 常用命令

```bash
node tools/render.mjs info <ep>              # 总时长和各段起止时间
node tools/render.mjs still <ep> <秒>         # 单帧 → out/still_<秒>.png
node tools/render.mjs contact <ep> 1.5       # 缩略图 → out/sheet_N.jpg，第 i 帧在 1.5 + i × 1.5 秒
node tools/render.mjs video <ep>             # 成片
node --test tools/*.test.mjs                 # 工具自带的测试
PYTHONPATH=music python3 episodes/<ep>/score.py episodes/<ep>/out/music.wav   # 单独出配乐；不给输出路径会写到 studio/music.wav
```

`video` 会自己重新生成配乐，不必先单独跑 `score.py`。

## 镜头的几个坑

- 从一个小场景飞到另一个，中途容易出现只有天空或一面虚化的墙的空帧。缩略图里重点找这种帧，给它加一个中途可看的东西，或缩短移动时间。
- 标签和印章出现的时间要够长（至少 1.5 秒），否则观众读不完。
- 小场景悬在同一片雾里时，彼此隔开足够远，别让上一个场景的边角闯进下一个镜头。

## 往小红书、抖音上传大文件

Chrome 扩展的文件上传上限是 10 MB，成片通常 50 MB 以上。做法：在后台运行本 skill 的 `scripts/serve-upload.mjs <成片.mp4> <封面.jpg>`，它在本机起一个只监听 127.0.0.1 的临时小服务器（只允许 `https://creator.xiaohongshu.com` 跨域，20 分钟后自动退出）；再在发布页里用脚本取回文件，构造 `File` 对象，通过 `DataTransfer` 放进页面的 `input[type=file]` 并触发 `change`，脚本头部的注释里有这段页面代码。封面在"编辑封面"里用同样的办法换。第 1 集就是这样传上去的（56 MB）。电脑控制工具对浏览器只能看不能点，所以发布全程用 Chrome 扩展。

### 抖音（creator.douyin.com）

同一个办法，实测可用（第 1 集，56 MB）。不同的地方：

- 起服务器时加 `ORIGIN=https://creator.douyin.com`，否则页面取不到文件。
- 上传页是 `https://creator.douyin.com/creator-micro/content/upload`，视频放进页面上 `accept` 含 `video/mp4` 的那个 `input[type=file]`；传完自动进入发布页。
- 发布页：标题栏不超过 30 字；正文在下面的描述框里，话题直接打 `#词`，等下拉出现后按回车选第一项，一个一个加。
- 封面：点「选择封面」（竖封面 3:4），在弹窗里把 `/c.jpg` 放进 `.semi-upload input.semi-upload-hidden-input`（「上传封面」那个），点「完成」；随后弹出的横封面提示选「暂不设置」，平台会按竖封面自动生成横版。
- 其他设置保持默认（公开、允许保存、立即发布）。
- **点「发布」后抖音可能要短信验证码。** 这一步只能用户本人做：停在弹窗上，请用户在浏览器里获取并填写验证码。
