# Phase 1.8.1 · Node UI ทั้ง 5 ประเภท

วันที่ 2026-11-15 · Codex · **พัฒนาเสร็จ / ตรวจรอบ Codex ผ่าน / รอ Gemini ตรวจรับ**

## ขอบเขตที่ส่งมอบ

ใช้ Contract v1 และ node kinds เดิม ไม่เพิ่ม schema, node title field, Scene Composer หรือ Music/Voice model ใหม่ การอนุญาตเริ่ม1.8.1ใช้กับการปรับ UI บนข้อมูลปัจจุบัน อิง DESIGN.md และ mockup โดยไม่ถือว่าภาพเปลี่ยนพฤติกรรม Core

| Node | UI และพฤติกรรม |
|---|---|
| Scene | บทพูดสรุป จำนวนบทพูด/สื่อ ภาพย่อจากไฟล์ภาพเดิมเฉพาะ Scene ที่เลือก; ไม่มี Choice ใช้ next มี Choice ใช้ UUID ของแต่ละ Choice + fallback |
| Branch | สรุป AST พร้อม AND/OR/NOT และวงเล็บ; จำกัดความยาว/ความลึกเฉพาะ summary, แก้เต็มใน Inspector; ไม่ evaluate AST ใน React |
| Effect | ตัวแปร/operator/value ตามลำดับ แสดง4รายการแรกและจำนวนที่เหลือ พร้อมข้อความ clamp; next |
| Schedule | startDay–lastDay รวมวันสุดท้าย จำนวน Activities/Events และชื่อกิจกรรมสรุป; onComplete |
| End | ending/return/jump พร้อม Graph ปลายทางเมื่อ jump; ไม่มี source handle |

ทุกการ์ดมีชนิดภาษาอังกฤษ/คำอธิบายไทย UUID เป็นข้อมูลรอง สถานะเริ่มกราฟ selected/focus และผล Error/Warning จาก Core พร้อมข้อความ ปุ่มเปิด Inspector ใช้คีย์บอร์ดและส่ง focus ไปหัวข้อได้ เชื่อมผ่านฟอร์มเดิมด้วยคีย์บอร์ดได้

แสดง fallback ว่าไม่มี Choice ผ่าน visibleIf ไม่มี next ซ้ำกับ Choice ports ไม่มี layer/Music/Voice สุ่มหรือปุ่ม Composer ที่ยังใช้งานไม่ได้ ตัวเลขสื่อมาจาก assetIds จริง ไม่เรียกว่า layers

## Draft และการบันทึก

- Inspector เก็บ draft แยกตาม node ใน session เมื่อสลับ selection หรือออก/กลับ Story Graph; Cancel คืน canonical ที่ Core ยืนยัน
- Inline draft เก็บข้าม graph/viewport unmount; ถ้า canonical เปลี่ยนระหว่างเก็บร่าง จะเตือนและบล็อก Apply จาก baseline เก่า ไม่ทับข้อมูลใหม่เงียบ ๆ
- Apply ยังคงใช้ Core Patch/Undo/Redo เดิม การเปิด node/preview ไม่สร้าง Patch หรือ Autosave ร่างฟอร์มที่ยังไม่ Apply
- เปรียบเทียบ draft กับ canonical ด้วย stableJSON เพื่อไม่ให้ลำดับ object keys จาก Rust กลายเป็น conflict ปลอม
- ภาพย่ออ่านไฟล์ผ่าน assetFile ที่ตรวจ path; โหลดเฉพาะ selected Scene, ไม่สร้าง audio/video runtime ต่อการ์ด และ revoke Blob URL เมื่อเลิกใช้

draft ฟอร์มเหล่านี้เป็น **session memory** ไม่ใช่ IDB recovery draft; refresh/ปิดแท็บ/เปลี่ยน Project อาจทิ้งร่างที่ยังไม่ Apply ข้อมูลที่ Core ยืนยันแล้วจึงเข้าระบบ IDB/Autosave เดิม ตำแหน่งกราฟยังเป็น session state

## Checklist ตรวจรอบ Codex

- [x] S1 การ์ดครบ5ชนิด ข้อมูลจริง พอร์ตและvalidationตามContract
- [x] S2 Inspector/inline draft, Cancel, Apply/Undo/Redo, thumbnail lifecycle
- [x] S3 keyboard, focus, selection, responsive1440/1000/700 และตรวจภาพจริง
- [x] S4 build/unit/Editor regression/targetedNodeUI/performance
- [x] S5 บันทึกหลักฐานและส่งตรวจ แยกพัฒนาเสร็จกับตรวจรับร่วม
- [ ] Gemini ตรวจรับตาม checklist1.8.1 และลงผลใน gemini.md

## ผลทดสอบ

| ตรวจ | ผล / หลักฐานใต้ evidence/1.8.1 |
|---|---|
| TypeScript/Vite production | ผ่าน; Core asset `39d9c8c997eb6762` เดิม |
| Unit | 15/15 |
| Node UI proof | 6 กลุ่ม 0 errors · `node-ui-browser.json` |
| Editor regression | 11 กลุ่ม 0 errors · `regression-editor/editor-browser.json` |
| Performance P1–P7 | ผ่านทั้งหมด · `performance/performance-P1-P7.json` |
| Design detector | ไม่พบรายการ · `design-detect.json` |

Edge157.0.4341.60 บน Windows เครื่องนี้; UI tests ใช้ production Worker/IndexedDB/OPFS จริงแต่ injected picker ไม่ใช่การกด native picker/ถอน OS permission ใหม่

Performance ใช้ warmup1+measured5/median/max ตาม0b.5 ไม่ลด fixture/เปลี่ยน threshold: P1 38.6ms; P2 7.3ms; P3 18.3ms; P4 688,197bytes; P5 1,268.3ms (max1,386.2); P6 92.8ms (max105.3); P7 64.0ms (max73.5) เก็บค่าทั้งหมดในJSON

P8/SDK ใช้ผลรับจาก1.7เป็นหลักฐานเดิม ไม่อ้างว่ารันทดสอบnative/SDKใหม่กับbuildนี้ การเปลี่ยนรอบนี้เป็นUIและsessiondraft ไม่เปลี่ยนCore/exporter; Gate1.8ส่วนที่เหลือยังต้องตรวจรวมอีกครั้ง

ภาพตรวจ: `node-scene.png`, `node-branch.png`, `node-effect.png`, `node-schedule.png`, `node-end.png`, `node-ui-1440.png`, `node-ui-1000.png`, `node-ui-700.png` ปุ่มโฟกัสปรับ fitView เฉพาะnodeเพื่อไม่ตัดการ์ดสูง

## ข้อจำกัดและส่งต่อ

ยังไม่มีชื่อ node ที่แก้และบันทึกได้, Scene layers, music/voice controls หรือ editor sidecar; อยู่ขั้น1.8.2–1.8.7ตามแผน รูปแบบ/model/semanticsใหม่ต้องยืนยันก่อน implement

Vite chunk warning ~518.9kB ยังอยู่ ไม่ปิด warning ไม่รับรอง performance บนเครื่อง/สื่อทุกขนาด ชุดภาพทดสอบ thumbnail ใช้ไฟล์PNGขนาดเล็กเพื่อตรวจ lifecycle ไม่ใช่พิสูจน์ภาพขนาดใหญ่
