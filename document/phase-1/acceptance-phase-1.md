# ตรวจรับ Phase 1 เพื่อใช้งานจริง

วันที่ 2026-11-14 · Codex · อ่านผล Gemini, checklist และหลักฐานร่วมแล้ว

**มติ: รับ Phase 1 และ Gate 1 ตามขอบเขต Web Studio MVP พร้อมใช้สร้างโปรเจกต์จริงในวงทดลองบน Windows/Edge ที่ผ่านการทดสอบ** ยังต้องทำ Phase 2 เรื่องความทนทานและทดลองผู้ใช้ก่อนสรุปพร้อมใช้งานวงกว้าง การรับครั้งนี้ไม่ได้เพิ่มขอบเขต Scene Composer หรือ custom node ใหม่

## ผลตาม checklist

| ขั้น | ผลรับ | หลักฐานหลัก |
|---|---|---|
| 1.1 Worker / Contract / browser readiness | ผ่าน | `foundation-1.1.md`, `evidence/contract-proof.json` |
| 1.2 Project / Story Editor / node 5 ชนิด / Undo–Redo | ผ่าน | `editor-1.2.md`, regression รอบนี้ 11 กลุ่ม |
| 1.3 Variables / Effects / Conditions / Schedule | ผ่าน | `rules-1.3.md`, UI/native parity 10 cases / 79 steps |
| 1.4 Playtest / SetVar / Rewind / Diagnostics | ผ่าน | `playtest-1.4.md`, Playtest 9 กลุ่ม |
| 1.5 Autosave / IDB / lock / conflict recovery | ผ่าน | `recovery-1.5.md`, `evidence/1.7/cases-D/recovery-browser.json` 8 กลุ่ม + close/recover 6 รอบ |
| 1.6 Export / Source Map / template / Save warning | ผ่าน | `export-1.6.md`, SDK เกมเดิมและเกมใหม่ผ่าน |
| 1.7 UI ว่าง → Save/reopen → Playtest → Export → SDK | ผ่าน | `end-to-end-1.7.md`, Full E2E, SDK, A–D และ P1–P8 |
| Gate 1 | ผ่านร่วม | Gemini รับ 1.7 และ Gate 1 ใน `gemini.md`; Codex ยืนยันหลักฐานรอบนี้ |

## การยืนยันในรอบนี้

- Build production ผ่าน; TypeScript unit 15/15; Editor regression ใหม่ 11 กลุ่ม 0 errors บน Edge 157
- ตรวจรายงาน 16 ไฟล์พร้อม SHA256, source hashes ของ performance ตรงกับโค้ดปัจจุบัน และ production build ยังคง `index-BhoyhudF.js`
- P1–P7 ผ่านตาม median ที่ยืนยัน; P8 native-folder ครบ warmup 1 + measured 5, median 1,631.7 ms, max 1,860.2 ms ≤ 5,000 ms
- P8 report hash ตรง disk audit และตรวจ manifest hashes บนดิสก์ซ้ำตรง; ไม่แทน native ด้วย OPFS
- C transaction ผ่าน 18/18; C+ page/context close ผ่าน; เก็บ failed/aborted attempts เดิมไว้

หลักฐานใหม่: [acceptance-audit.json](evidence/release-review/acceptance-audit.json), [Editor regression](evidence/release-review/editor/editor-browser.json)

รอบนี้รันใหม่เฉพาะ build/unit/Editor และตรวจหลักฐานที่รับแล้ว ไม่อ้างว่ารัน SDK, performance หรือถอน native OS permission ใหม่ทั้งหมด P8 ใช้ Summer House 9 nodes; P1–P3/P5–P6 ใช้ baseline 2,000 nodes

## ใช้จริงได้ในขอบเขตใด

เปิดหรือสร้าง Project → จัดกราฟ 5 ชนิด → ตั้งกติกา → ทดลองและตรวจ trace → บันทึก/กู้ร่าง → ส่งออกและรันใน SDK ได้ ใช้ Chrome/Edge desktop ที่มี API ครบ บน localhost/HTTPS; เครื่องอ้างอิงที่มีหลักฐานคือ Windows/Edge 157 และ SDK 8.3.7

| ข้อจำกัด | ผลต่อผู้สร้างเกม / วิธีทำงานปัจจุบัน |
|---|---|
| ตำแหน่ง node เป็น session state | เปิดใหม่จัดตำแหน่งใหม่; ยังไม่มี layout ที่บันทึกข้าม session |
| Scene มี `assetIds` เรียงรายการ | ภาพเป็นการเปลี่ยนฉาก, วิดีโอเป็น cutscene, เสียงเป็น sound; ยังไม่มีตำแหน่ง sprite, music channel, voice cue หรือ layer composer |
| Playtest มุ่ง logic / trace | ต้องดู presentation สุดท้ายใน Ren'Py SDK; ไม่ใช่ preview ภาพเสียงที่เทียบ SDK แล้วทุกกรณี |
| IDB เป็นร่าง ไม่ใช่ backup ถาวร | เก็บสำเนาโฟลเดอร์โปรเจกต์และสื่อเองก่อนย้ายเครื่อง/ล้างข้อมูล browser หรือเปลี่ยน schema |
| Recovery tests ส่วนใหญ่ injected faults/OPFS | ไม่รับรองทุกกรณี OS crash/disk full/permission บนทุกเครื่อง; ขยายและทดสอบจริงต่อใน Phase 2 |
| Template และ Save compatibility | ติดตั้ง template แยกจาก generated transaction; Save warning ไม่รับประกัน Save เก่าใช้ได้หลังแก้โครงสร้าง |
| P6 บาง sample เกิน 150 ms | ผ่าน median ตามมติ; ไม่อ้างว่าทุก interaction ผ่านเพดาน |

Vite chunk warning ~511.7 kB ยังมีอยู่; ไม่พบข้อบกพร่องใหม่ที่ขัดเกณฑ์ Gate 1 ในรอบนี้ ข้อจำกัดข้างต้นเป็นสิ่งที่ต้องแจ้งผู้ใช้และใช้วางแผนต่อ ไม่ยกระดับเป็นฟีเจอร์ที่อนุมัติเอง

## ก่อนเริ่มใช้งานโปรเจกต์จริง

1. รัน `start-studio.cmd` ที่ root หรือ build แล้ว `npm --prefix studio run preview`; เปิด URL ใน Edge desktop
2. เลือกโฟลเดอร์โปรเจกต์เฉพาะงาน ให้สิทธิ์ และสำรองโฟลเดอร์รวม `game/assets/`
3. สร้างฉากตัวอย่างของเกมจริงหนึ่งเส้นทาง ตรวจ Save/reopen, Validate, Playtest และ Export แล้วรัน SDK ก่อนขยายทั้งเกม
4. ทำ Phase 2.1–2.3 ตาม checklist เดิม; แผน customize สื่ออยู่เอกสารแยก ต้องยืนยันก่อนเริ่มพัฒนา
