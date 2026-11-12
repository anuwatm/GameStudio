# ผลวิเคราะห์ StoryFlow ด้วย Understand

วิเคราะห์จาก working tree ปัจจุบัน อ้างอิง commit `b81f762cf03d702de9dc2346d73fb7c25717f891` วันที่ 2026-11-12 ภาษาไทย คงศัพท์เทคนิคอังกฤษ ไม่เปิด auto-update หรือ commit hook

## ขอบเขตและผล

ใช้ bundled scanner, import resolver และ structural extractor ของ plugin ตาม `.understandignore` ที่เจ้าของยืนยัน Scan รอบสุดท้ายได้ **155 ไฟล์** ตัด 75 รายการด้วย ignore/default rules ปัจจุบัน ตัวเลข 230 จาก scan ระหว่างทางจึงไม่ใช่ coverage ของกราฟสุดท้าย ไฟล์ agent ที่ถูก gitignore ไม่อยู่ใน inventory นี้

| หมวด | จำนวน |
|---|---:|
| code | 47 |
| config | 71 |
| docs | 28 |
| markup | 8 |
| script | 1 |
| infra / data | 0 |

กราฟมี **288 nodes / 427 edges**: file 56, function 112, class 21, config 71, document 28; แบ่ง 8 layers และ guided tour 8 ขั้น

Layers: ตรรกะ Rust Core; CLI และ WASM Worker; Web Studio; โฟลเดอร์และ Transaction; Contract และ Fixtures; Ren’Py Template; หลักฐานและการออกแบบ; แนวคิดและการตั้งค่าโครงการ

## แนวทางอ่านระบบ

1. เริ่มที่ README/Concept/checklist เพื่อแยกสถานะทำแล้วกับแผน
2. Core Contract v1 กำหนด Project, Worker envelopes และ StepTrace; Rust เป็นผู้ตรวจ Schema และตรรกะจริง
3. `sf-core` ทำ Project/EditHistory, expressions/effects, Validator, Simulator และ Ren’Py generation โดยไม่มี I/O
4. `sf-cli` ทำ I/O และ SDK parity ส่วน `sf-wasm` กับ module Worker เป็นทางเรียก Core จาก browser
5. React อ่าน snapshot จาก Worker ผ่าน CoreClient ที่จับ requestId; timeout/crash หยุด session ไม่ replay mutation ที่ไม่ทราบผล
6. Web Studio ปัจจุบันเป็น Phase 1.1: เปิด fixture, graph/Inspector แบบอ่านอย่างเดียว, แก้ชื่อ, Undo/Redo และ Validate ใน memory
7. Local Folder/transaction/recovery เป็น prototype แยก มี staging, backup, journal, hash และ manifest commit ท้ายสุด ยังไม่ใช่ Export UI ที่เชื่อมครบวงจร
8. อ่าน SDK parity, filesystem tests และ Edge proof เป็นคนละชั้นหลักฐาน การสร้างกราฟนี้ไม่ได้รัน regression ของผลิตภัณฑ์ใหม่

## ตรวจความถูกต้อง

- File coverage ครบ 155/155; ไม่มี filePath นอก inventory
- Imports ใช้ผล bundled resolver ครบ 30 edges ไม่สร้าง import จากการเดา
- Normalize `path` เป็น `filePath`, เปลี่ยน edge `defines` เดิมเป็น `contains`, เติม symbol ranges จาก bundled extraction และตรวจ endpoints
- Inline validator ไม่มี issues; canonical `validateGraph` ของ plugin ผ่าน
- Fingerprints baseline สร้างสำเร็จครบ 155 ไฟล์ก่อนเขียน meta.json
- Dashboard บน Edge โหลดกราฟได้ ไม่พบ uncaught page errors แสดงภาพรวม 8 layers ตามค่าเริ่มต้น ดู [ภาพ](dashboard.png) และ [ผล browser](dashboard-check.json)

## ข้อจำกัดและ warnings

- Validator เตือน orphan 57 nodes โดยมากเป็นเอกสาร/หลักฐานหรือ helper ที่ไม่มีเส้นอ้างอิงชัดเจน ไม่เติมความสัมพันธ์สมมติเพื่อซ่อนคำเตือน รายการเต็มอยู่ [analysis-report.json](analysis-report.json)
- Ren’Py และ WebM ไม่ได้รับ structural parsing แบบ source language ที่รองรับ จึงอธิบายบทบาทจากข้อความ/พาธและหลักฐานที่มี ไม่อ้างตรวจ codec หรือ runtime จาก binary
- Graph อธิบายโครงสร้าง ไม่รับรองความครบของทุก dynamic call หรือทุก class method; lineRange แสดงเฉพาะตำแหน่งที่ extractor ยืนยัน
- Subagents หยุดจาก account usage limit ระหว่าง semantic analysis; Codex หลักตรวจและเติมกราฟจาก structural outputs/partial artifacts ต่อ Reviewer ที่ลองใหม่ตรวจ coverage 155/155, imports 30/30 และ symbol ranges 59 รายการแล้ว พบ summary ผิด 1 จุดใน exporter ซึ่งแก้เรียบร้อย ผลอยู่ใน [independent-review.json](independent-review.json) และ [review-resolution.json](review-resolution.json)
- Reviewer ยังเตือนว่า summary บาง function กว้าง และกราฟยังไม่มี Rust class→method ownership edges ครบ เหมาะสำรวจระดับระบบ/ไฟล์ก่อน แล้วเปิด source เมื่ออ่านระดับ method
- Prebuilt viewer ของ release v2.9.7 ตอบ HTTP404 จึงใช้ dashboard Vite ที่ติดตั้งใน plugin อยู่แล้ว ไม่มีการติดตั้ง dependency เพิ่ม
- สำรองกราฟ/fingerprints/meta เดิมไว้ในโฟลเดอร์ `backup-*` ก่อนแก้ไข ไม่เปลี่ยนโค้ดผลิตภัณฑ์หรือสถานะตรวจรับ Phase

ผลหลัก: [knowledge-graph.json](knowledge-graph.json), [fingerprints.json](fingerprints.json), [meta.json](meta.json)
