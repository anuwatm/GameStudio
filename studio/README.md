# StoryFlow Web Studio · Phase 1.3

React + React Flow เชื่อม Rust/WASM Worker ด้วย Core Contract v1 ไม่มี Backend

ปัจจุบันเปิด/สร้างโปรเจกต์ บันทึก manual จัดการตัวละคร/สื่อ แก้กราฟและตั้ง Rules & Schedule ได้: Variables, recursive Conditions, ordered Effects, Activities, Events และ Target Subgraph พร้อม Undo/Redo และ Core Validate ตัวอย่างยังอยู่ใน memory ส่วน Autosave/IndexedDB, Playtest และ Export UI เป็นขั้นถัดไป

หน้า Project ใช้เพิ่มตัวละครและลงทะเบียนพาธสัมพัทธ์ใต้ `game/assets/` แล้วหน้า Story Graph ใช้เพิ่ม/เลือก/เชื่อมโหนด แก้ Inspector หรือข้อความบนกราฟ และกดบันทึกโปรเจกต์เมื่อทำงานกับโฟลเดอร์ ตำแหน่งโหนดยังเป็น view state ของ session ดู [ขอบเขตและผล 1.2](../document/phase-1/editor-1.2.md)

หน้า Rules & Schedule ใช้แท็บ Variables / Daily Schedule / Events ส่วน Conditions/Effects ของฉากและ choices อยู่ใน Inspector กดใช้ข้อมูลก่อนบันทึก ดู [ผลและวิธีตรวจ 1.3](../document/phase-1/rules-1.3.md)

## รันบน Windows

จาก Command Prompt เรียก `C:\LocalDevine\www\GameStudio\start-studio.cmd` ได้โดยตรง สคริปต์ตั้ง working directory ให้อัตโนมัติ เปิด URL ที่ Vite แสดง แล้วกด Ctrl+C เมื่อต้องการหยุด ส่ง option เพิ่มได้ เช่น `start-studio.cmd --port 5174`

ต้องมี Node.js ≥22.12 และไฟล์ WASM release ที่ build จาก Rust source รุ่นเดียวกัน ดูเครื่องมือ Rust ใน [README หลัก](../readme.md)

```powershell
$env:CARGO_HOME = "$PWD/temp/cargo"
$env:RUSTUP_HOME = "$PWD/temp/rustup"
$env:CARGO_TARGET_DIR = "$PWD/temp/wasm-target"
$env:PATH = "$PWD/temp/cargo/bin;$env:PATH"
$env:RUSTFLAGS = '--cfg getrandom_backend="custom"'
cargo build -p sf-wasm --target wasm32-unknown-unknown --release
npm --prefix studio ci
npm --prefix studio run dev
```

เปิด URL ที่ Vite แสดง ด้วย Chrome/Edge desktop บน localhost หรือ HTTPS ต้องมี File System Access API, Web Workers, WebAssembly, IndexedDB, Web Locks และ Web Crypto

```powershell
npm --prefix studio run build
npm --prefix studio run preview
```

ผล build อยู่ `studio/dist/` ต้องเสิร์ฟผ่าน HTTP(S) เปิด `file://` ไม่รองรับ ใช้ relative base เพื่อ deploy ใต้ subpath ได้ API presence ไม่รับรองสิทธิ์โฟลเดอร์หรือพื้นที่จัดเก็บที่ใช้งานจริง

`prepare:core` คัดลอก canonical `crates/sf-wasm/worker.mjs` และ WASM ไป path ที่มี hash ของทั้งสองไฟล์ Generated files ถูก ignore ไม่ใช่ source ใหม่ หากเปลี่ยน Rust ต้อง build WASM ใหม่ก่อน build Studio เสมอ สามารถกำหนด `$env:SF_WASM_PATH` เป็นพาธ WASM อื่นได้ ไม่ควรนำ WASM เก่ามาอ้างว่าเป็นผลจาก Rust ปัจจุบัน

## ตรวจซ้ำ

```powershell
npm --prefix studio test
npm --prefix studio run build
npm --prefix studio run proof:build
$env:PYTHONPATH = "$PWD/temp/stack-python"
$env:SF_PROOF_OUT = 'document/phase-1/evidence/1.2/regression-1.1'
python -u studio/tests/browser-proof.py
python -u studio/tests/editor-proof.py
python -u studio/tests/rules-proof.py
```

Browser proof ใช้ Python + Playwright และ Edge ตามพาธ Windows ในสคริปต์ รวม `temp/rust-target/debug/sf-cli.exe` สำหรับเทียบผล native โปรเจกต์เดิมติดตั้ง Playwright ที่ `temp/stack-python` แล้ว เครื่องใหม่ต้องติดตั้ง Python package `playwright` ก่อน แล้วปรับ PYTHONPATH ตามที่ติดตั้ง

Proof build อยู่ `temp/studio-proof-dist/` แยกจาก production และไม่ควรเผยแพร่หน้า test ผลเก็บใน [หลักฐาน 1.1](../document/phase-1/foundation-1.1.md)

Editor proof ใช้ OPFS handles จริงและจำลอง picker ไม่ใช่ native OS permission test ผลเก็บแยกใน [หลักฐาน 1.2](../document/phase-1/editor-1.2.md) ไม่เขียนทับหลักฐานตรวจรับ 1.1 เดิม

## ขอบเขตสถาปัตยกรรม

- `src/core/client.ts`: requestId, Contract v1, Result/Error, timeout และ termination; timeout หยุดทั้ง session ไม่ replay mutation ที่ไม่ทราบผล
- `src/core/create.ts`: สร้าง Worker จากชุด assets ที่เตรียมไว้
- `src/core/features.ts`: ตรวจ requirements โดยไม่ขอสิทธิ์โฟลเดอร์
- `src/core/editor.ts`: UI command → atomic JSON Patch โดยไม่แทนตรรกะ Rust
- `src/core/rules.ts`, `src/ui/RuleFields.tsx`, `RulesPane.tsx`, `ScheduleFields.tsx`: typed rule forms/reference handling ร่วม Rules และ Inspector ไม่มี JS evaluation ของเกม
- `src/core/folder.ts`: เปิด/สร้าง/recover-before-open, manual Save พร้อม conflict check และ backup guard สำหรับ Schema ที่ไม่รองรับ
- `src/ui/`: แสดง snapshot ที่ Core ยืนยันแล้ว ตำแหน่ง node คำนวณเฉพาะการแสดงผล ไม่มี UI schema/logic ทดแทน Rust
- `tests/contract-probe.ts`: ใช้ client เดียวกับแอป ทดสอบทุก request name ที่รองรับในรอบนี้ และส่งผลให้ test driver เทียบ CLI

ไม่ถือว่าผ่าน P5–P8 จาก screenshot หรือ fixture ขนาดเล็ก ต้องวัดตามมติ 0b.5 ในขั้นตรวจรับที่เกี่ยวข้อง
