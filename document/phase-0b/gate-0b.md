# Gate 0b · ผลตรวจรับร่วม Codex/Gemini

วันที่ 2026-11-12 · Phase 0b พัฒนาเสร็จและตรวจรับผ่านร่วม Codex/Gemini ครบ 0b.1–0b.5 และ Gate 0b ตามผลตรวจอิสระใน gemini.md

| ขั้น | ผล / หลักฐาน |
|---|---|
| 0b.1 Local Folder | ผ่านร่วม Codex/Gemini · [native 10 checks](evidence/native-report.json) |
| 0b.2 Transaction | ผ่านร่วม Codex/Gemini · [Transaction](transaction-0b2.md) |
| 0b.3 กลุ่ม B | ผ่านร่วม Codex/Gemini · [SDK ภาษาไทย/literal/VP9+Opus](media-0b3.md), Rust 13, SDK Parity 10/79 |
| 0b.4 กลุ่ม C/C+ | ผ่านร่วม Codex/Gemini · [Recovery](recovery-0b4.md), browser page/context close จริง, actual native permission unavailable/regrant และ audit 8 hashes ตรงเดิม |
| 0b.5 Decision | เจ้าของยืนยัน D1/D2 ด้วยข้อความ “ยืนยัน D1 และ D2 ตามไฟล์” · [มติ](decision-gate-0b5.md) |

## ข้อตัดสินใจสำหรับ Phase 1

- ใช้ Rust sf-core / WASM Worker ต่อ, Core Contract v1, SDK 8.3.7.25031702
- ใช้ P1–P8 พร้อมวิธีวัดในมติ 0b.5 เป็นเกณฑ์ MVP โดย applyEdit median ≤100 ms แทน 16 ms ชั่วคราว
- UI ใช้ React + React Flow; ยังไม่มี Web Studio MVP ที่ทำงานครบวงจร ใช้ DESIGN.md และ mockup เป็นมาตรฐานก่อนพัฒนา
- รูปแบบ I/O: Local Folder, staged backup/journal, commit manifest ท้ายสุด, เปิดใหม่ต้อง recover ก่อน export; read/permission failures ต้องหยุดอย่างมีเหตุผล
- Template เกมใหม่รองรับ Noto Thai/TCC และรักษาข้อความเป็น literal ส่วนเกมเดิมไม่ให้เขียนทับหน้าจอหรือ filter เอง

## ผลวัดล่าสุด

Worker/native เท่ากัน 18 ข้อความ, กราฟ 2,000 โหนด: open 79.2 ms / Validate 19 ms / applyEdit 36.7 ms (median5), WASM Brotli 670,237 bytes ดู [รายงาน](evidence/gate-worker-report.json) ตัวเลขนี้ไม่รวม React rendering หรือ native export และไม่ได้ทำให้ P5–P8 ผ่านล่วงหน้า

## ข้อจำกัดส่งต่อ

- Native permission test เป็นการสิ้นสุด browser session ขณะ pending แล้วพบ handle prompt/NotAllowedError ใน session ใหม่ เจ้าของ regrant ผ่าน UI ไม่ใช่การ automate แก้ browser security settings
- Native first recovery return ไม่ถูกเก็บแยกก่อน report ถูกการเรียกซ้ำเขียนทับ จึงตรวจรับด้วย raw response equal=true + audit hashes บนดิสก์ + pending absence และเก็บข้อจำกัดไว้ในเอกสาร ไม่ปลอม recovered:true
- แก้ harness ให้ idempotent และป้องกันกดซ้ำแล้ว; storage adapter เดิม recover ซ้ำเป็น no-op อยู่แล้ว
- Web Locks ไม่ล็อก external editors และ transaction ไม่ atomic ข้ามไฟล์ต่อผู้อ่านภายนอก
- เคยมี Windows EPERM ใน Node test driver รอบ 0b.3; regression ล่าสุดผ่าน 18 checks ไม่อ้างว่าแก้ต้นเหตุ OS file lock แล้ว UI Phase1 ต้องแสดง failure/recovery ที่เกิดจริง
- TCC ไม่ใช่พจนานุกรมตัดคำ, ทดสอบเสียงระดับ decoder/playback ไม่ใช่การอัดเสียงลำโพง
- test runs ที่ค้าง/ผิด setup ใน temp เก็บเพื่อวินิจฉัย ไม่ใช่โปรเจกต์ที่จะส่งมอบผู้ใช้

Gemini ตรวจ Gate รอบล่าสุดแล้วตาม gemini.md พร้อมเริ่ม Phase 1.1 โดยยังไม่ได้เริ่มพัฒนา Phase 1 ในรอบตรวจรับนี้
