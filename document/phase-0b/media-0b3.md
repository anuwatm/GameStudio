# Phase 0b.3 · ภาษาไทย, Literal และ WebM

วันที่ 2026-11-12 · พัฒนาเสร็จ / Codex ตรวจรับผ่าน · รอ Gemini ตรวจรับอิสระ ไม่ใช่การปิด Gate 0b

## ผลตาม checklist

| ขั้น | ผล |
|---|---|
| 0b.3.1 | CLI export เกมใหม่ติดตั้งเทมเพลตพร้อม Noto Thai/OFL, Latin fallback และ Thai Character Cluster wrapping; fixture ใช้คลิป WebM จริง VP9+Opus 640×360 / 3 วินาที |
| 0b.3.2 | BUG-0b-001 แก้แล้ว: Character name ไม่ double percent; บทพูด/choice ยัง escape ตาม say/menu; string initial/effect เก็บค่าดิบถูกต้องและแสดงผล literal |
| 0b.3.3 | SDK 8.3.7.25031702 Lint ผ่าน, เกมจบ exit 0, ตรวจ rendered layouts และภาพ 5 ภาพจริง ไทยยาวไม่ล้นและไม่แยกสระที่ขอบบรรทัด วิดีโอจบไม่ถูก skip |

## สิ่งที่แก้

- [Exporter](../../crates/sf-core/src/export.rs): แยก character_name จาก dialogue เพราะ Character constructor รับ Python string และไม่ผ่าน legacy percent interpolation ของ say/menu ชื่อ 100% จึงไม่กลายเป็น 100%%
- String ใน initial/effect เป็นข้อมูล ไม่เติม escape สำหรับการแสดงผลลงในค่าที่ใช้คำนวณหรือเปรียบเทียบ ใน screen ใช้ interpolation `!q` เพื่อแสดง tags เป็น literal
- [CLI](../../crates/sf-cli/src/main.rs) ติดตั้ง [เทมเพลต](../../templates/renpy/README.md) เฉพาะการสร้างเกมใน directory ใหม่ ผ่าน export/smoke/parity; ไม่เขียน UI/font ทับเกมเดิมผ่าน Local Folder adapter
- ฟอนต์ไทย Noto Sans Thai Looped UI พร้อม SIL OFL 1.1; Latin fallback ใช้ DejaVuSans ที่ SDK มีอยู่ ไม่แจกจ่ายฟอนต์ Windows
- HarfBuzz shaping + Unicode line breaking และ presentation soft breaks ด้วย TCC; ใช้โมดูล PyThaiNLP v5.1.2 ที่ไม่แก้ source พร้อม Apache-2.0 license เพิ่มจุดแบ่งตอน render เท่านั้น ไม่เปลี่ยน Project/RunState/string values
- Template ใช้ init offset=-100 ให้หน้าจอผู้ใช้หรือ harness override ได้ ส่วน test instrumentation อยู่แยก ไม่เข้า production exporter

## หลักฐานตรวจรับ

[ผล SDK](evidence/media-0b3/media-result.json) ตรวจข้อความจาก Text layout หลัง substitution/tag processing เทียบค่าที่รู้คำตอบ ไม่ตรวจเพียงสคริปต์ที่สร้าง:

| บริบท | ผล |
|---|---|
| ชื่อตัวละคร | ไทยพร้อมวรรณยุกต์และ `[name] ] {b} } 100% "คำพูด" \path` ตรงข้อความต้นฉบับ ไม่มี %% เพิ่ม |
| บทพูด | special literal และข้อความไทยยาวไม่มีช่องว่างตรงต้นฉบับ ตัดเป็น 5 บรรทัด ความกว้าง 1192/1200 px |
| ตัวเลือก | ข้อความ literal ตรงต้นฉบับและเลือกจนไป ending ได้ |
| String initial | ค่าดิบและข้อความที่ render ตรงต้นฉบับ |
| String effect | ตั้งค่าแล้วทั้งค่าดิบและภาพตรงข้อความใหม่ รวม newline เป็น 2 บรรทัด |

Harness ตรวจว่า layout มีอยู่, ไม่กว้างเกินพื้นที่, ไม่มี combining mark ลอยขึ้นต้นบรรทัด และไม่มี leading vowel เ–ไ ค้างท้ายบรรทัด; Codex อ่านภาพเพิ่มเติมเพื่อยืนยันรูปอักษร ไม่ใช้ assertion แทน visual inspection ทั้งหมด

- [ชื่อ/บทพูด/ค่าเริ่มต้น](evidence/media-0b3/say.png)
- [ตัวเลือก](evidence/media-0b3/choice.png)
- [String หลัง Effect](evidence/media-0b3/string.png)
- [เฟรมวิดีโอต้นช่วง](evidence/media-0b3/movie-early.png) / [หลังเวลาเดินต่อ](evidence/media-0b3/movie-late.png)

วิดีโอ: [ffprobe](evidence/media-0b3/ffprobe.json) ยืนยัน VP9, Opus 48 kHz, container 3.008 วินาที; SDK movie_cutscene ใช้เวลา 3.031 วินาที, interrupted=false, movie channel มี 57 samples ไปถึง 2.986 วินาที และเดินต่อถึง ending หลังเล่นจบ ภาพต้น/หลังมี timecode และ frame number ต่างกัน ไม่ใช่ภาพนิ่งแทนวิดีโอ

เสียง: pcm_ok=true และไม่ได้ตั้ง SDL_AUDIODRIVER ทับ (driver=default) เป็นการตรวจ decoder/playback pipeline และ channel progress ไม่ใช่การบันทึกเสียงลำโพงหรือการยืนยันระดับเสียงที่ผู้ใช้ได้ยิน

ผล regression:

- Rust workspace **13 เทสต์ผ่าน** รวม regression แยก percent context
- SDK Parity A/A+ **10 เคส / 79 ก้าวผ่าน** หลังเพิ่มเทมเพลต: [รายงาน](evidence/media-0b3/parity-report.json)
- Transaction regression **18 checks ผ่าน**: [รายงานรอบนี้](evidence/media-0b3/transaction-regression.json)
- [Lint](evidence/media-0b3/lint.txt) ผ่าน มีคำแนะนำทั่วไปให้เปิด check_conflicting_properties ไม่ใช่ script error
- [Environment / source SHA-256](evidence/media-0b3/environment.json)

Regression filesystem รอบหนึ่งเจอ Windows EPERM ตอน rename ใน Node test handle adapter; ไม่กลืน error รอบนั้น รันใหม่ใน directory ใหม่ผ่านครบ 18 checks ยังไม่ยืนยันสาเหตุของ transient file lock ให้ติดตามใน 0b.4 ผลนี้ไม่เปลี่ยนหลักฐาน 0b.2 ที่เก็บเดิม

## รันซ้ำ

ใช้ Rust/linker ตาม [environment 0a](../phase-0a/worker-0a7.md), Node, ffmpeg/ffprobe และ SDK ที่ตรึงแล้ว:

```powershell
cargo test --workspace --locked --offline
cargo build -p sf-cli --locked --offline
node scripts/prepare-media-0b3.mjs temp/rust-target/debug/sf-cli.exe temp/media-new-run
```

ปลายทางต้องเป็น directory ใหม่ สคริปต์ใช้ [fixture](media-probe/project.json), สร้างคลิป test pattern พร้อม sine 440 Hz, export ผ่าน CLI, ใส่ [harness](media-probe/probe.rpy) และ expected.json; มี [คลิปอ้างอิง](media-probe/probe.webm) ของรอบตรวจรับเก็บไว้ด้วย

```powershell
$env:RENPY_SKIP_MAIN_MENU = '1'
$env:RENPY_SKIP_SPLASHSCREEN = '1'
$env:RENPY_DISABLE_JOYSTICK = '1'
Remove-Item Env:SDL_VIDEODRIVER -ErrorAction SilentlyContinue
Remove-Item Env:SDL_AUDIODRIVER -ErrorAction SilentlyContinue
$game = (Resolve-Path temp/media-new-run).Path
$sdk = (Resolve-Path temp/trace-spike/renpy-8.3.7-sdk/renpy.exe).Path
$run = Start-Process $sdk -ArgumentList @($game) -WindowStyle Hidden -PassThru
if (!$run.WaitForExit(60000)) { $run.Kill(); throw 'SDK probe timed out' }
if ($run.ExitCode -ne 0) { throw 'SDK probe failed' }
Get-Content temp/media-new-run/media-result.json
```

Lint ใช้ `sf-cli lint SDK_DIR GAME_DIR`; Parity ใช้ `sf-cli parity contract/fixtures/summer-house.json contract/fixtures/summer-house-cases.json SDK_DIR NEW_DIR` ต้องใช้ Desktop Session และห้าม SDL_VIDEODRIVER=dummy รอบนี้ SDK ภายใน sandbox เจอ Windows os error 623 จึงรัน Desktop Session ภายนอก sandbox

## ข้อจำกัดและส่งต่อ

- TCC เป็นการแบ่งกลุ่มอักษรที่ปลอดภัยสำหรับการขึ้นบรรทัด ไม่ใช่พจนานุกรมแบ่งคำตามความหมาย อาจตัดระหว่างส่วนของคำ แต่ไม่ใช้ anywhere ที่พบว่าแยกสระนำออกจากพยัญชนะ
- config.replace_text เป็นของเทมเพลตเกมใหม่ เกมเดิมต้องเลือกผสานกับ UI/filter ของตนเอง ไม่เขียนทับให้อัตโนมัติ
- ทดสอบชุดอักษร/ข้อความและความกว้างที่เก็บหลักฐาน ไม่อ้างว่ารองรับฟอนต์ทุกภาษา ข้อความยาวไม่จำกัด หรือทุกเกม/อุปกรณ์เสียง
- ภาพก่อนแก้ใน evidence/render-before-fix.png เป็นหลักฐานประวัติเท่านั้น ใช้ภาพใน media-0b3/ ตรวจรอบนี้
- 0b.4 ยังต้องปิดแท็บจริง/สิทธิ์หลุดและตรวจ recovery; 0b.5 ยังต้องมติภาษา Core และเกณฑ์ประสิทธิภาพ

แหล่งอ้างอิง: [Noto Thai](https://notofonts.github.io/thai/), [OFL](https://github.com/notofonts/thai/blob/main/OFL.txt), [PyThaiNLP TCC v5.1.2](https://github.com/PyThaiNLP/pythainlp/blob/v5.1.2/pythainlp/tokenize/tcc.py), [Ren'Py Text](https://www.renpy.org/doc/html/text.html) โดยพฤติกรรมที่ตรวจรับอ้างโค้ดและการรัน SDK 8.3.7 ที่ตรึง ไม่อ้างผลจาก nightly SDK
