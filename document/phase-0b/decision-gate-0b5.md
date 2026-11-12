# Decision Gate 0b.5 · มติภาษา Core และเกณฑ์ MVP

วันที่ 2026-11-12 · มติ D1/D2: เจ้าของโครงการยืนยันแล้วในแชทด้วยข้อความ “ยืนยัน D1 และ D2 ตามไฟล์” · 0b.4 ตรวจรับด้าน Codex ผ่านแล้ว ดู gate-0b.md

## มติ D1 · ใช้ Rust/WASM ต่อสำหรับ MVP

ใช้ sf-core (Rust) เป็นแหล่งตรรกะเดียว เชื่อมเว็บผ่าน sf-wasm / Web Worker และตรวจบนเครื่องผ่าน sf-cli คง Core Contract v1 และ SDK 8.3.7.25031702 ไม่เริ่ม port TypeScript ใน MVP

เหตุผลจากหลักฐาน:

- Core/SDK Parity A/A+ ตรง 10 เคส / 79 ก้าว และ Rust workspace 13 เทสต์ผ่านล่าสุดใน 0b.3
- Worker รุ่นปัจจุบันตรง native ครบ 18 ข้อความ สัญญาข้อมูลไม่ต้องเปลี่ยนเพื่อเริ่ม Phase 1
- Exporter, Simulator, Validator และ Source Map มี implementation เดียว ลดงานทวนซ้ำเมื่อทำ UI
- การย้าย TypeScript ตอนนี้ต้องทำ Core ใหม่และผ่าน Contract/fixture/Parity เดิมครบ ยังไม่มีหลักฐานปัญหา Rust ที่ทำให้ต้องย้าย

สิ่งแลกเปลี่ยน: ต้องดูแล Rust toolchain + WASM binding และพิจารณาต้นทุน JSON/snapshot ของ applyEdit ซึ่งยังเกินเป้าชั่วคราว 16 ms การเลือก Rust ไม่ใช่การยืนยันว่าเป้าประสิทธิภาพเว็บผ่านแล้ว

## หลักฐานรวม

| งาน | ผลปัจจุบัน |
|---|---|
| 0a Core/SDK | 10 เคส / 79 ก้าว; Contract/schema v1 |
| 0b.1 | Native Folder 10 checks, media reused ไม่เขียนซ้ำ |
| 0b.2 | Transaction, staged backup/journal/hash, Source Map และ Save warning; Codex/Gemini ผ่าน |
| 0b.3 | SDK literal/ไทย/TCC/WebM ผ่าน; Codex/Gemini ผ่าน |
| 0b.4 | ปิด page/context จริงกู้ hashes ตรง 100%; native handle กลับเป็น prompt และ API NotAllowedError จริง หลังเจ้าของ regrant audit ทั้ง 8 hashes ตรง baseline และ pending หาย ดู recovery-0b4.md |

เอกสาร: [Worker 0a.7](../phase-0a/worker-0a7.md), [Transaction 0b.2](transaction-0b2.md), [Media 0b.3](media-0b3.md), [ผลปิด page จริง](evidence/recovery-browser-report.json)

## Baseline รุ่นปัจจุบัน

[รายงาน Edge Worker 2026-11-12](evidence/gate-worker-report.json) · Windows, 4 logical processors, Edge 157, WASM release build, fixture 2,000 nodes hash 9872ffbb991fd00c324e18ae0afbcd9cca7d0449fa0b21ae8a3f890acc29bd33

Warm-up 1 รอบ แล้วเก็บ 5 samples ใช้ median รวม Worker messaging / JSON / result ไม่รวมการโหลด WASM ครั้งแรกหรือการวาดกราฟ:

| ตัวชี้วัด | 0a.7 เดิม | รอบปัจจุบัน |
|---|---:|---:|
| openProject | 215.5 ms | 79.2 ms |
| Validate | 29.7 ms | 19.0 ms |
| applyEdit | 73.5 ms | 36.7 ms |
| WASM Brotli | 669,601 bytes | 670,237 bytes |
| WASM raw | 3,683,337 bytes | 3,683,029 bytes |

ผลสองรอบต่างกันอาจรวม runtime/load/JIT และสภาพเครื่อง ไม่สรุปว่าปรับ algorithm แล้วเร็วขึ้นตามสัดส่วนนี้ รอบปัจจุบัน openProject มี sample แรก 387.4 ms จึงเก็บทุก sample ในรายงาน ไม่ตัดทิ้ง

Export baseline มีคนละวิธี: native prototype 0b.1 export ซ้ำ 3661.5 ms; 0b.2 edit→CLI→filesystem sample ประมาณ 892–951 ms และ regression ล่าสุดประมาณ 1236 ms ห้ามใช้ตัวเลข Node adapter อ้างเป็น browser native pipeline หรือรวมเป็น median เดียวกัน

## มติ D2 · เกณฑ์ประสิทธิภาพ Phase 1

เจ้าของยืนยันตารางนี้เป็นเป้าสำหรับตรวจ MVP บนเครื่องอ้างอิงแล้ว ไม่ใช่ผลตรวจผ่าน UI ที่ยังไม่ได้สร้าง

| ID | ขอบเขต / วิธีวัด | เกณฑ์ที่ยืนยัน |
|---|---|---:|
| P1 | Worker openProject กราฟ 2,000 nodes หลัง WASM พร้อม รวม postMessage/JSON/ผลตอบ | median ≤ 2,000 ms |
| P2 | Worker Validate fixture เดียวกัน | median ≤ 200 ms |
| P3 | Worker applyEdit เปลี่ยนข้อความหนึ่งฉาก รวม validation และรับ snapshot ใหม่ | median ≤ 100 ms |
| P4 | WASM release Brotli quality 11 ไม่รวม SDK/fonts/media | ≤ 1,000,000 bytes |
| P5 | React Flow แสดง viewport ใช้งานได้ หลังรับ Project snapshot 2,000 nodes จาก Worker | median ≤ 2,000 ms |
| P6 | เลือก node → Inspector ของ node นั้นปรากฏ ไม่รวมโหลดไฟล์สื่อ | median ≤ 150 ms |
| P7 | เปิด preview local WebM fixture VP9+Opus 640×360 / 3 วินาที → first decoded frame | median ≤ 1,000 ms |
| P8 | edit ข้อความหนึ่งฉาก → Core/export → native-folder commit manifest และ UI แจ้งสำเร็จ ไม่รวมเวลาผู้ใช้ตอบ picker/permission | median ≤ 5,000 ms |

P3 ใช้แทนค่า 16 ms ที่ระบุว่าเป็นเป้าชั่วคราวใน Concept: ปัจจุบัน full validation + full snapshot มี baseline 36.7–73.5 ms ค่า 100 ms ให้เกณฑ์ MVP ที่ทดสอบได้ พร้อมเก็บ latency samples เพื่อปรับปรุงต่อ ไม่สับสนกับ frame budget ของกราฟ

P5–P7 ยังไม่มี UI baseline ใช้เป็นเกณฑ์ตรวจใน 1.7 โดยอาศัย fixture และเครื่องที่ตรึง ไม่ถือว่า UI ผ่านจากผล Core หรือ SDK

วิธีตรวจร่วม: warm-up 1 รอบ / 5 รอบวัดจริง, เก็บทุก sample + median + max, แยก Core/UI/media/I/O, ระบุ browser/OS/build/fixture hash เริ่มต้นสถานะเดียวกัน ไม่โหลดสื่อหรือ grant dialog ระหว่างจับเวลาที่ไม่เกี่ยวข้อง หากมี error/conflict/EPERM ให้รายงานเป็นความล้มเหลวและตรวจสาเหตุ ไม่ทิ้งรอบนั้นเพื่อให้ median ผ่าน การรันใหม่ต้องเป็นชุดใหม่พร้อมเหตุผล

เป้าใช้กับ Windows reference + Chromium desktop และ fixture ที่ระบุ ไม่รับรอง arbitrary hardware/กราฟทุกขนาด/วิดีโอทุก codec ไม่มีเป้า network/cold-start ที่ยังไม่ตกลงแอบรวมใน P1

## มติและเงื่อนไขปิด Gate 0b

- [x] เจ้าของยืนยัน D1: Rust/WASM ต่อสำหรับ MVP
- [x] เจ้าของยืนยัน D2: P1–P8 และวิธีวัดตามตาราง (หรือระบุค่าที่ต้องแก้)
- [x] 0b.5.3 ไม่เข้าเงื่อนไข: เลือก Rust/WASM จึงไม่มีการ port หรืออ้างผลทดสอบ TypeScript
- [x] Native permission test ใน 0b.4 ผ่าน และบันทึกผลตรวจรับกลุ่ม C/C+ ก่อนปิด Gate 0b

มติ: ยืนยัน D1 Rust/WASM และ D2 P1–P8 พร้อมวิธีวัดตามเอกสารนี้แล้ว เป้า applyEdit 100 ms ใช้แทน 16 ms ชั่วคราว และต้องใช้ผลการตรวจ 0b.4 ประกอบก่อนปิด Gate 0b การผ่าน Core baseline ไม่ได้ทำให้ UI/Export MVP ผ่านเป้าโดยอัตโนมัติ
