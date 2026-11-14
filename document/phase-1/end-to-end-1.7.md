# Phase 1.7 · End-to-End และ Performance

วันที่ 2026-11-14 · ผู้พัฒนา/ผู้ตรวจรอบนี้: Codex

**สถานะ: 1.7.1–1.7.4 เสร็จและผ่านรอบ Codex** — P1–P8 ผ่านครบ; Gemini รับ 1.7.1–1.7.3 และ P1–P7 แล้ว เหลือตรวจหลักฐาน P8 ใหม่และลงมติปิด Gate 1 ร่วมกัน

## Checklist และหลักฐาน

| ขั้น | ผล Codex | หลักฐานใต้ `evidence/1.7/` |
|---|---|---|
| 1.7.1 สร้าง Summer House จาก UI ทั้งหมด → Save → เปิดใหม่ | ผ่าน | `full-e2e/full-e2e.json`, `ui-project.json` |
| 1.7.2 Playtest → Export จาก UI → รัน output เดิมใน SDK 8.3.7 | ผ่าน | `full-sdk.json`, `full-sdk-lint.txt`, `full-sdk-run.txt` |
| 1.7.3 A/A+, B, C/C+, D | ผ่านตามขอบเขตด้านล่าง | `cases-ABC-summary.json`, `cases-C-transaction.json`, `cases-Cplus-browser.json`, `cases-D/recovery-browser.json` |
| 1.7.4 P1–P8 | ผ่าน Codex; รอ Gemini ยืนยัน P8 | `performance-P1-P7.json`, `native-P8-visible.json`, `native-P8-disk-audit.json` |
| Build / unit / Editor regression | ผ่าน | build TypeScript/Vite; unit 15/15; `regression-editor/editor-browser.json` 11 กลุ่ม |
| ตรวจรับร่วม / Gate 1 | ผ่านบางส่วน / ค้าง Gate | Codex และ Gemini รับ 1.7.1–1.7.3 และ P1–P7 แล้ว; P8 ผ่าน Codex แล้ว รอ Gemini ตรวจรายงานรอบใหม่ก่อนปิด Gate 1 |

สร้าง Project ว่างจริงผ่าน UI: 2 graphs, 9 nodes, 9 edges รวม Choices, Variables, Effects, nested Condition AST, Activities, Events และ Schedule ไม่โหลด graph skeleton และไม่ใช้ JSON editor สร้างเนื้อหา เทียบ fixture ด้วย UUID mapping และ normalize เฉพาะลำดับ collection ระดับบน ไม่สลับ Choice/Effects/Trace

Worker/native เท่ากัน 55 ข้อความ / 10 cases / 79 steps; save/reload แล้ว Playtest และ Export จริง จากนั้นใช้ output ชุดเดียวกันใน SDK (test-only entry wrapper ไม่แก้ generated source) ได้ Ending, day 3, Variables และ once-event ตรง Core

## Performance

ใช้วิธีและขนาด fixture ตาม [Decision Gate 0b.5](../phase-0b/decision-gate-0b5.md): warmup 1 + measured 5 เก็บทุกค่า ใช้ median ตัดสิน พร้อม max; ไม่รวม warmup ใน median และไม่ตัด failed attempts ทิ้ง รายงาน JSON เป็นแหล่งอ้างอิงตัวเลขสุดท้าย

| เกณฑ์ | median ล่าสุด (ms) | max (ms) | เป้า |
|---|---:|---:|---:|
| P1 Worker open 2,000 nodes | 51.3 | 162.8 | 2,000 |
| P2 Validate | 12.2 | 14.2 | 200 |
| P3 applyEdit | 25.7 | 27.8 | 100 |
| P4 WASM Brotli 11 | 688,197 bytes | — | 1,000,000 bytes |
| P5 graph usable after Worker response | 1,179.9 | 1,273.2 | 2,000 |
| P6 select → Inspector | 131.9 | 173.9 | 150 |
| P7 WebM first decoded frame | 51.4 | 63.5 | 1,000 |
| P8 edit → native Export commit + success UI | 1,631.7 | 1,860.2 | 5,000 |

P6 มีหนึ่ง measured sample เกิน 150 ms แต่ median ผ่านตามวิธีที่ตกลง; P7 warmup 1,288.6 ms เก็บไว้ครบ ไม่อ้างว่าทุก sample ผ่าน เป้าทดสอบนี้ไม่ใช่ cold network startup

P1–3/P5–6 ใช้ baseline 2,000 nodes SHA256 `9872ffbb991fd00c324e18ae0afbcd9cca7d0449fa0b21ae8a3f890acc29bd33`; P7 ใช้ WebM VP9+Opus 640×360/3.008s เดิม รายงานเก็บ browser, hardware, build และ source hashes

## สิ่งที่แก้และข้อจำกัด

- P6 ก่อนแก้ median 1,660.2 ms: รักษา node/data/callback references, memo edges และ render เฉพาะ viewport; Inspector เตรียมรายการปลายทางครบเมื่อ focus/pointer โดยยังแสดงค่าที่เลือกเดิม ไม่ลดจำนวนโหนด fixture
- Recovery close/reopen พบ lock ของหน้าเก่าค้าง แม้ retry 1s: เพิ่ม pagehide คืน lease เมื่อ idle หรือหลัง operation จบ บล็อก operation ใหม่จากหน้าที่ออกแล้ว; BFCache restore reload เพื่อเข้า normal ownership/recovery flow อีกครั้ง ไม่ steal lock จากแท็บใช้งานอยู่ D ผ่าน 8 กลุ่ม พร้อม close/recover เพิ่ม 6 รอบ
- A/A+ SDK 10 cases/79 steps ผ่าน; B ตรวจภาษาไทย, escaping 5 contexts และ WebM/PCM จริงผ่าน; C filesystem transaction 18/18 ผ่านหลังรันใหม่ใน directory ใหม่ รอบแรก EPERM rename เก็บไว้ใน `cases-C-node-failed-EPERM.txt` ไม่อ้างแก้ต้นเหตุ OS
- C+ ปิด page/context แล้วเปิด persistent profile กู้ hash ครบและ idempotent ผ่าน; D ใช้ IndexedDB/Web Locks/OPFS จริง แต่ picker/permission/quota faults เป็น injected tests ไม่แทนการถอน native OS permission จริง ข้อพิสูจน์ native permission เดิมอยู่ Phase 0b
- เก็บ performance failures ก่อนแก้, incomplete run, lock failures และ P8 attempt1 timeout ไว้ ไม่ถือว่าเป็นผลผ่าน
- Vite แจ้ง chunk ใหญ่กว่า 500 kB ยังอยู่ ไม่ปิด warning; WASM/Core asset เดิม `39d9c8c997eb6762` ไม่เปลี่ยน gameplay contract

## ผล P8 native-folder และวิธีตรวจซ้ำ

ใช้ `python -u studio/tests/native-performance-server.py` แล้วเปิด URL ที่แสดง กด “เลือกโฟลเดอร์จริงและเริ่ม P8” และอนุญาต folder ใน `native-visible-config.json` ด้วยผู้ใช้เอง หน้า harness ส่ง genuine handle ให้ production UI และวัด 6 รอบ ตรวจ scene text ที่เปลี่ยนจริงและ manifest hashes ทุกครั้ง

การตรวจซ้ำต้องได้ `native-P8-visible.json` ครบ warmup+5, hashes ถูกต้อง, median ≤5,000 ms และตรวจไฟล์จริง (รอบปัจจุบันครบแล้ว) OPFS/Node adapter หรือคำยืนยันอนุญาตอย่างเดียวไม่นับ P8

Server bind เฉพาะ localhost และ whitelist build/test page/config/report; broad workspace server เคยถูก auto-review ปฏิเสธและเปลี่ยนเป็นวิธีจำกัดขอบเขตแล้ว ไม่เปิด workspace ทั้งชุด

### Native P8 รอบที่สำเร็จ · 2026-11-14
ผู้ใช้เลือกและอนุญาตโฟลเดอร์จริงใน Microsoft Edge 157; Windows 11, 4 logical processors, production UI build `index-BhoyhudF.js` ตรงกับ P1–P7

- Warmup: 1,935.2 ms; measured 5: 1,860.2 / 1,567.7 / 1,743.5 / 1,627.2 / 1,631.7 ms
- median 1,631.7 ms, max 1,860.2 ms ผ่าน 5,000 ms; ใช้ Apply→Core/IDB→Save→Export→native manifest commit→success UI ตามเดิม ไม่รวม picker/permission
- `native-P8-visible.json`: complete/passed=true, genuine directory handle granted, 6 distinct scene edits และ generated hashes ทั้ง 24 รายการตรง
- `native-P8-disk-audit.json`: คำนวณ median ใหม่และอ่านไฟล์ดิสก์จริงอิสระ final manifest hashes ตรงทั้ง4ไฟล์; project/scene generated มีข้อความรอบ5จริง เก็บ SHA256 project/manifest/source map และ report แล้ว
- รายงาน AbortError ก่อน grant เก็บเป็น `native-P8-aborted-before-grant.json`; การรันใหม่แยก Edge ภายนอกสำเร็จ ไม่สรุปต้นเหตุ AbortError จากผลนี้
- 1.7.4 ไม่มีงานพัฒนาค้าง; Gemini ยังต้องตรวจผล P8 นี้ จึงไม่อ้างว่าปิด Gate 1 ร่วมแล้ว
