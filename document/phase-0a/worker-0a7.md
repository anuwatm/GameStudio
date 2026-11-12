# 0a.7 · WASM Worker และ Baseline

ตรวจบน Windows เครื่องพัฒนา วันที่ 2026-11-11 ด้วย Edge 157 แบบ headless, 4 logical processors และ rustc 1.99.1 x86_64-pc-windows-gnu ตามเครื่องอ้างอิงใน 0a.1

## ผลตรวจ

- Browser Web Worker และ native CLI รับ Core Contract เดียวกันครบ 18 ข้อความ ผลตอบกลับตรงกัน และผ่าน Worker JSON Schema ทุกข้อความ
- ครอบคลุม openProject/getProject, applyEdit, undo/redo, startPlaytest, choose, SetVar, Rewind, Validate, getTrace และข้อความที่ต้องถูกปฏิเสธ
- กราฟอ้างอิงมี 2,000 โหนด SHA-256 `9872ffbb991fd00c324e18ae0afbcd9cca7d0449fa0b21ae8a3f890acc29bd33`

| ตัวชี้วัด | ผลมัธยฐาน 5 รอบหลัง warm-up 1 รอบ |
|---|---:|
| เปิดโปรเจกต์ | 215.5 ms |
| Validate | 29.7 ms |
| applyEdit | 73.5 ms |
| WASM ดิบ | 3,683,337 bytes |
| Gzip | 1,032,414 bytes |
| Brotli quality 11 | 669,601 bytes |

เวลาที่วัดรวมการส่งข้อความข้าม Worker, JSON และการรับผลตอบกลับ คำสั่ง applyEdit ปัจจุบันตรวจทั้งเอกสารและส่ง snapshot กลับ ค่า 73.5 ms สูงกว่าเป้าชั่วคราว 16 ms ให้ใช้ baseline นี้ในการตัดสินใจและกำหนดเกณฑ์สุดท้ายที่ 0b.5 การวัดชุดนี้เป็นเวลาเปิดหลัง WASM พร้อมทำงาน และไม่รวมการวาดกราฟหรือสื่อ

ดู [ผล Browser](worker-evidence/browser-report.json), [ผล native](worker-evidence/native-results.json) และ [ข้อความที่ใช้ทดสอบ](worker-evidence/messages.json) รายงานเก็บ user agent, SHA-256 ของ WASM และ sample ทั้งห้ารอบ ส่วนรุ่น dependency ตรึงใน Cargo.lock

## รันซ้ำ

ติดตั้ง Rust target wasm32-unknown-unknown แล้ว build จากรากโปรเจกต์

```powershell
$env:RUSTFLAGS = '--cfg getrandom_backend="custom"'
cargo build -p sf-wasm --target wasm32-unknown-unknown --release --locked
```

build sf-cli ด้วย toolchain Windows ตาม 0a.3 และเตรียม web directory ใหม่

```powershell
node crates/sf-wasm/prepare-benchmark.mjs temp/rust-target/debug/sf-cli.exe temp/wasm-target/wasm32-unknown-unknown/release/sf_wasm.wasm temp/worker-new-run
node crates/sf-wasm/run-benchmark.mjs temp/worker-new-run "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" temp/worker-new-report.json
```

ตัวอย่างพาธ WASM ข้างต้นใช้ CARGO_TARGET_DIR=temp/wasm-target ตามการรันจริง หากใช้ target directory ปกติให้เปลี่ยนพาธให้ตรง Build native กับ WASM ใช้ RUSTFLAGS คนละชุด

## การออกแบบที่ใช้ในต้นแบบ

- sf-core::protocol::Session เป็นตัวประมวลผลข้อความเดียวกันสำหรับ native และ Worker ตรวจ payload ด้วย JSON Schema
- sf-wasm ใช้ JSON ABI กับ WebAssembly.Memory ตัว adapter รับผิดชอบจัดสรรและส่งข้อความ ส่วน Core ไม่มีการอ่านไฟล์ตรง
- import storyflow.random_fill ใช้ crypto.getRandomValues สำหรับ internal hash seeding ของ dependency การเล่นเกมใช้กติกา deterministic เดิม
- Session ถือ editor history และ snapshot ของ Playtest แยกกัน การควบคุม Playtest ใน binding รุ่นนี้ replay actions จาก snapshot เพื่อหลีกเลี่ยง reference ที่ผูกอายุเอกสาร หากเพิ่มขนาด session ให้ใช้ผลวัดประกอบการปรับการจัดเก็บ State

Gate Phase 0a ใช้ผล Parity 10 เคส/79 ก้าวจาก 0a.6 ร่วมกับ Contract และ baseline ชุดนี้ การตัดสินใจภาษาสุดท้ายยังอยู่ที่ 0b.5
