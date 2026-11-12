# 001 考试的梦 · 文案底稿

第一季《梦的解析》第 01 集，试点。文案由 Opus 直接写（中英一起），不经 Argon。第二稿（试点成片之后）按用户意见重写了 S2、S3：弗洛伊德那段原来是一串生硬的短句转折，现在改成一个人坐在对面慢慢讲的口气，句子完整、前后承接；S1 收紧到 6 屏。规格见 `docs/系列规划-梦的解析.md` 与 `docs/试点计划-001-考试梦.md`。

## 形式

- 竖屏 105 秒左右，有旁白（豆包语音 2.0，男声），旁白念的就是字幕，一字不差。
- 每屏最多两行：中文每行 ≤ 13 字，英文 ≤ 14 词、每行约 32 字符以内。
- 旁白把每屏的两行连起来念（中文直接拼接），所以行尾需要停顿的地方写了标点。
- 一句话可以跨两三屏：前面的屏在 `subs.json` 里标 `"cont": true`，这几屏的文字一起送去合成，一口气念完，字幕在念到停顿处换屏（见 `tools/voice.mjs`）。所以跨屏的地方，中英文的屏尾都尽量落在标点上。
- `subs.json` 里的 `sec` 是旁白时长的估算（中文每秒 4.5 字、英文每秒 2.8 词，取较长者 + 0.45 秒气口），`episode.json` 的 `scale` 设成 1。有了真实旁白后时间轴由 `timeline.json` 决定，`sec` 不再起作用。

## 结构

| 段 | 内容 | 画面 |
|---|---|---|
| S1 梦（6 屏，每屏一句） | 第二人称。毕业多年又坐回考场：卷子一个字不认识、这门课一学期没去、笔没水、钟、心里嘀咕「等等，我不是早就毕业了吗」；醒来愣几秒；过一阵它又来 | 深夜卧室 → 沉入梦里的空教室（第一人称）→ 醒回卧室 |
| S2 书（10 屏，4 组跨屏句） | 弗洛伊德也老做这个梦，写进《梦的解析》，归为典型的梦、会一次次回来；奇怪的是同行说只有考过的人才做，考砸的反而不做；他自己挂过法医学却从没梦到，梦里考的是怕得要命、最后都过了的植物学动物学化学；中学梦总考历史，那门他考得很好 | 3D 压暗虚化，2D 书页拼贴（照片、扉页、盖章卷子、标签）与发光线稿交替 |
| S3 落点（10 屏，3 组跨屏句） | 它挑第二天有要紧事、怕出丑的前夜（述职、面试、见家长）；于是翻出一场当年怕得要死、最后过了的旧考试；那句嘀咕是梦在安慰你：别怕明天，想想当年多怕，后来什么事都没有；明天那一关多半也这样过去；笔没水也不要紧，那张卷子早就交了 | 线稿：多年前那场考试 → 今晚的梦 → 明天；回到卧室，`dawn` |

## 可用事实（只用这些，已对照 Brill 英译第三版）

- 弗洛伊德把考试梦归在「典型的梦」里，说毕业考试的焦虑梦会顽固地反复出现。
- 一位同行告诉他：这种梦只出现在当年通过了考试的人身上，考砸的人不做。
- 这种梦出现在第二天有一件要负责任的事、可能丢脸的前夜。
- 梦里那句反驳「可我已经是医生了」，其实是梦给的安慰：别怕明天，想想当年考前你有多怕，后来什么事也没有。
- 他自己挂过法医学（博士学位考试的一门），却从没梦到它；梦里常考的是植物学、动物学、化学，这几门他当年提心吊胆，最后过了。中学考试的梦里总在考历史，那门他考得很好。
- 这些细节是后来的版本补写的，画面上不要在它们旁边标「1900」。

文案里不属于书的部分：「述职、面试、见对方家长」是我们自己举的例子；「我不是早就毕业了吗」是把书里「可我已经是医生了」换成观众的处境。

## 字幕（定稿见 `subs.json`；⤵ = `cont`，和下一屏连成一句、一次合成）

**S1 梦**
1. 毕业好多年了，／你又坐回了考场 — Years out of school, / and you're back in an exam.
2. 卷子发下来，一个字都不认识，／这门课你一学期都没去过 — Not one question makes sense. / You never went to this class.
3. 笔没水，甩了三下还是写不出，／抬头看钟，二十分钟没了 — Your pen is dry. Shake. Nothing. / The clock: twenty minutes gone.
4. 你心里还在嘀咕：／等等，我不是早就毕业了吗？ — Part of you protests: / wait, didn't I graduate?
5. 然后你醒了，愣了好几秒，／才想起来：早就不用考试了 — You wake up. It takes a moment: / right. No more exams.
6. 可过一阵子，／它又来了 — Months later, / it's back.

**S2 书**
1. 一百多年前，弗洛伊德／也老做这个梦。 — A century ago, Freud / kept having it too.
2. 后来他把这个梦／写进了《梦的解析》， — He put it in / The Interpretation of Dreams, ⤵
3. 归在「典型的梦」里，／说它会一次又一次地回来。 — called it a “typical dream,” / one that keeps coming back.
4. 奇怪的是，一位同行说，／只有当年考过的人才做这个梦， — Here's the odd part. A colleague / said only those who passed get it; ⤵
5. 真考砸了的，／反而不做。 — Those who really failed / never do.
6. 弗洛伊德自己就是这样。／他挂过一门法医学， — Freud fit the pattern. / He once failed forensic medicine, ⤵
7. 可这门课，／他一次也没梦见过。 — but never once / dreamed about it.
8. 他梦里考的，常常是植物学、／动物学、化学， — In his dreams, it was botany, / zoology, chemistry — ⤵
9. 这几门当年他怕得要命，／可最后，一门一门都过了。 — subjects he'd dreaded, / and passed, every one.
10. 梦回中学，考的总是历史，／而那门他考得很好。 — His school dreams were always / about history, which he'd aced.

**S3 落点**
1. 这个梦挑日子也有讲究，／常在第二天有件要紧事、 — It picks its nights, too: / the night before something big, ⤵
2. 你怕自己出丑的前一晚，／比如要述职，要面试， — when you could look foolish — / a presentation, an interview, ⤵
3. 或者要去见对方的家长。 — or meeting their parents.
4. 于是梦翻出一场旧考试——／你当年怕得要死， — So the dream digs up an old exam, / one that terrified you, ⤵
5. 最后却好好过了的那场。 — and that you passed just fine.
6. 梦里那句／「我不是早就毕业了吗」， — That “didn't I graduate?” / in the dream ⤵
7. 弗洛伊德说，那是梦在安慰你：／别怕明天。 — is, Freud says, a comfort: / don't be scared of tomorrow. ⤵
8. 想想当年考试前你有多怕，／后来什么事都没有。 — Think how scared you were then — / and nothing happened.
9. 明天那一关，／多半也会这样过去。 — Tomorrow will most likely / go the same way.
10. 所以笔没水也不要紧，／那张卷子，你早就交上去了。 — So never mind the dry pen. / You turned that exam in years ago.

## 自查记录

- 每行字数、行数：脚本逐屏检查，中文每行 ≤ 13 字，英文每屏 ≤ 14 词、每行 ≤ 34 字符。
- 时长按真实旁白算：全片 105.3 秒（S1 2.4–29.8，S2 29.8–67.2，S3 67.2–101.9，片尾 3.4）。每屏 2.4–6.3 秒，没有 < 1.2 或 > 7 秒的。
- 同一句组里中英旁白长度尽量接近（靠改文案）：差得最多的是 S1 第 4、5 屏（单屏，英文各长约 1 秒），其余都在 0.8 秒以内；跨屏句组里，中英各自的换屏点相差都在 0.4 秒以内。
- 没有元信息、没有「研究表明」式的免责；归属只用「弗洛伊德说」「一位同行说」「他把这个梦写进了《梦的解析》」。
- 弗洛伊德部分逐句对照上面的可用事实；没有加年份、人名或别的说法。「明天那一关，多半也会这样过去」是我们顺着书里那句安慰说的，没有算在弗洛伊德头上。
- 英文按口语重写，不逐字直译（例如「怕得要死」→ terrified you，「述职」→ a presentation，「典型的梦」→ a “typical dream,” one that keeps coming back，「见对方家长」→ meeting their parents）。

## 标题备选

中文（用「你」开头，把这个梦说成人人有份的事）：
1. 你梦到的那场考试，其实早就考过了
2. 你又梦到考试了？弗洛伊德说，那是梦在安慰你
3. 你总梦见考试，是因为明天有件事让你怕

英文：
1. You Already Passed the Exam You Keep Dreaming About
2. Still Dreaming About Exams? Freud Says the Dream Is Comforting You
3. Why You Dream About Exams the Night Before a Big Day

## 用时

从 `new-episode` 建集（12:42:02）到最后一遍 contact（英文、中文）看完（13:02:30），按系统时钟约 20 分钟（20 分 28 秒）。建集之后做的事都算在里面：写文案、下载并登记素材、搭场景、做 2D 图层、写配乐、中英各一遍 contact、修图。引擎升级（任务 1–3）在建集之前完成，不算在内。
