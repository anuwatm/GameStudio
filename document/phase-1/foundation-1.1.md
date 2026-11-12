# Phase 1.1 · React / React Flow / Worker

วันที่ 2026-11-12 · ผู้พัฒนา/ตรวจฝั่ง Codex · สถานะพัฒนาเสร็จ รอ Gemini ตรวจรับร่วม ไม่ใช่การปิด Phase 1 ทั้งหมด

## ขอบเขตและผลตาม checklist

| รายการ | ผล | หลักฐาน |
|---|---|---|
| 1.1.1 Browser / File System Access API | ตรวจ secure context, desktop Chromium และ 6 API; เมื่อขาด API ปิดปุ่มเปิดตัวอย่าง พร้อมเหตุผล | features.ts, browser-proof.json |
| 1.1.2 React + React Flow + Worker | กราฟและ Inspector อ่าน snapshot จาก Rust Core; เปิด main/subgraph; ตำแหน่งแสดงผลไม่เขียนลง schema | ภาพ Project/Graph, browser-proof.json |
| 1.1.3 Command/Query/Patch/Result/Error | เปลี่ยนชื่อด้วย Patch, Undo/Redo, Validate; proof ใช้ client เดียวกับ production ส่งครบ 11 request names และเทียบ CLI 20 ข้อความตรงทุกข้อความ | contract-proof.json, browser-proof.py |
| Transport failure | ทดสอบ requestId กับ response สลับลำดับ, CORE_ERROR แล้วใช้งานต่อ, timeout, response ผิดชื่อ, crash และ capability detection ผ่าน 6 unit cases | npm test |
| Browser failure | ตัด File System Access API แล้วปิด Open; WASM HTTP503 แสดงข้อผิดพลาด, Restart แล้วเปิดได้ ไม่ replay command | browser-proof.json |
| Build / ภาพ | TypeScript + Vite production ผ่าน; Edge 157.0.4341.46; ไม่ overflow ที่ 1440/1000/700px; detector static ไม่พบ findings | ภาพ 4 ภาพ, design-detect.json |

## วิธีตรวจซ้ำ

ดู [studio/README.md](../../studio/README.md) สำหรับ build Rust/WASM, npm ci, dev/build และ test driver

- `npm --prefix studio test` — 6 cases
- `npm --prefix studio run build` — TypeScript และ production
- `npm --prefix studio run proof:build` — เพิ่มหน้า test เฉพาะ output แยกใน temp
- `python -u studio/tests/browser-proof.py` — เสิร์ฟ production/proof ใต้ subpath บน localhost แล้วเปิด Edge จริงด้วย Playwright; เทียบผล CLI แบบ JSON deep equality ไม่มีการ normalize ทิ้งข้อมูล

Test server ระบุ MIME ของ .js/.mjs/.wasm เอง เนื่องจาก Windows registry ส่ง MIME .js ไม่ตรงจน browser ปฏิเสธในรอบแรก ตัว driver ตั้ง stdout UTF-8 เพื่อพิมพ์รายงานได้บน Windows; ปัญหาสองรายการนี้เกิดใน harness ไม่ใช่ Core

## หลักฐาน

- [ผล browser 7 กลุ่มตรวจ](evidence/browser-proof.json)
- [20 requests/results และ error envelopes](evidence/contract-proof.json)
- [ผล static design detector](evidence/design-detect.json) — `[]`; ไม่แทนการตรวจภาพหรือ accessibility เต็มรูปแบบ
- [Project 1440](evidence/project-1440.png), [Main graph 1440](evidence/graph-1440.png), [Subgraph 1000](evidence/graph-1000.png), [Subgraph 700](evidence/graph-700.png)

## ข้อตัดสินใจและข้อจำกัดส่งต่อ

- ใช้ DESIGN.md/mockup เดิม สีจาก token กลาง; เจ้าของยืนยันภาษาไทยเป็นหลัก คงศัพท์เทคนิคอังกฤษ (2026-11-12); brand/font/typography/radius/breakpoints ยังไม่ล็อกสำหรับ component library
- ขณะนี้ทุกอย่างใน memory; Reload/Restart Core ทิ้ง session พร้อมคำเตือนชัดเจน ไม่มีการเปิดโฟลเดอร์จริงใน UI และไม่แสดง Saved
- Node graph อ่านอย่างเดียว แสดงชื่อ kind + short ID และบทพูดจริง; ไม่มี field name/position เพิ่มใน Core และไม่สร้าง semantic rules ซ้ำฝั่ง React
- Worker timeout หยุด session ทั้งชุด ข้อมูลสุดท้ายที่ UI ยืนยันยังแสดงได้ แต่ต้อง Restart และเปิดใหม่ก่อนส่งคำสั่งต่อ ไม่มีการ replay mutation ที่อาจทำสำเร็จไปแล้ว
- ชุด Worker/WASM ใช้ hash จาก bytes ของทั้งสองไฟล์; canonical Worker อ้าง WASM ด้วย import.meta.url รองรับ subpath การแก้ Rust ต้อง build WASM ใหม่ก่อนเสมอ prepare:core ไม่ได้ build Rust ให้อัตโนมัติ
- Capability detection เป็น presence check ไม่รับรองการให้สิทธิ์โฟลเดอร์/พื้นที่จัดเก็บ/permission recovery; งานเหล่านั้นเชื่อมใน 1.2/1.5/1.6
- กราฟย่อเพื่อเห็นภาพรวม; pan/zoom ได้ เมื่อ viewport เล็กบางโหนดอยู่นอกพื้นที่ canvas ใช้ Fit view เพื่อจัดใหม่ Inspector แยกด้านล่างบนจอแคบ
- ทดสอบ fixture ขนาดเล็ก ไม่อ้างผ่าน P5/P6 หรือ P7/P8; เกณฑ์ประสิทธิภาพตรวจตาม protocol 0b.5 ในขั้นที่เกี่ยวข้อง
- Playtest requests พิสูจน์ผ่าน test entry เท่านั้น หน้า Playtest ของผลิตภัณฑ์เป็นงาน 1.4 ส่วนการแก้ฉาก/สื่อ/ตัวละครเป็น 1.2

## ตรวจรับ

อัปเดตภาษา UI ตามคำยืนยันเจ้าของ 2026-11-12: ไทยเป็นหลัก คงศัพท์เทคนิคอังกฤษ Build/Edge proof ผ่านซ้ำ 7 กลุ่มตรวจ ภาพหลักฐานทั้ง 4 ภาพเป็น UI ภาษาไทย ตรวจที่ 1440/1000/700px แล้ว ไม่พบข้อความล้นหรือสระวรรณยุกต์ถูกตัดในส่วนที่ตรวจ คง error message/field/enum และเนื้อหาเกมเดิม

Codex: ผ่านเกณฑ์ทางเทคนิค 1.1 ทั้งสามรายการ ผล build/unit/browser และ native parity ตามข้างต้น

Gemini: รอตรวจรับจาก source, gpt.md และหลักฐานนี้ ภาษา UI ยืนยันแล้วให้ใช้ไทยเป็นหลัก คงศัพท์เทคนิคอังกฤษ; ชุด visual tokens ที่ยังค้างต้องยืนยันก่อนล็อก component library; ไม่ถือว่าเจ้าของตรวจรับภาพจากผล detector
