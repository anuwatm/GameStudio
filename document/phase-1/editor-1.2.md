# Phase 1.2 · Project และ Story Editor

วันที่ 2026-11-12 · Codex พัฒนาเสร็จและตรวจตามชุดทดสอบด้านล่างแล้ว รอ Gemini ตรวจรับร่วม ไม่ใช่การปิด Phase 1 ทั้งหมด

ก่อนเริ่มอ่านผลตรวจ 1.1 ใน gemini.md/checklist.md แล้ว และ cleanup บันทึกงาน 1.1 ที่ปิดใน gpt.md เก็บ Contract, ภาษา UI และข้อจำกัดส่งต่อ

## ผลตาม checklist

| รายการ | ผลพัฒนาและตรวจฝั่ง Codex |
|---|---|
| 1.2.1 เปิด/สร้างโปรเจกต์ | หน้า Project เรียก native showDirectoryPicker แบบ readwrite อ่าน project.storyflow.json หลัง recover; สร้างโปรเจกต์ใหม่กับ game/assets และปฏิเสธการสร้างทับไฟล์เดิม; manual Save ใช้ hash และ Web Lock |
| 1.2.2 ตัวละคร/สื่อ | เพิ่ม แก้ ลบตัวละคร ตั้ง portrait และผู้พูด; ลงทะเบียนพาธใต้ game/assets ตรวจสื่อหายและพรีวิวไฟล์เดิมผ่าน Blob URL; ยกเลิกทะเบียนล้าง references แต่ไม่ลบหรือคัดลอกไฟล์สื่อ |
| 1.2.3 กราฟ | เพิ่ม scene/branch/effect/schedule/end, ลากโหนดหรือย้ายด้วยปุ่ม, เลือก/โฟกัสด้วย keyboard, ลบ/เชื่อมผ่านฟอร์มหรือพอร์ต, สลับ main/subgraph และเพิ่ม Subgraph พร้อม return entry |
| 1.2.4 Scene Editor | Inspector แก้หลายบรรทัด ผู้พูด สื่อ และ choices; โหนดบนกราฟแก้บทพูดแรกและข้อความ choices ได้ ใช้ Core snapshot ชุดเดียวกัน; ID/visibleIf/effects เดิมคงอยู่เมื่อเปลี่ยนข้อความ |
| 1.2.5 Undo/Redo + guard | ลบโหนดพร้อม edges และ entry replacement ใน applyEdit เดียว Undo ครั้งเดียวคืน nodes/edges/graphs ครบ; เปลี่ยน choice ล้าง obsolete ports ใน Patch เดียว; Schema อื่นสำรอง raw bytes ก่อนปฏิเสธ ไม่เดา migration |

Schema v1 เป็นรุ่นแรก ยังไม่มี migration จากรุ่นเก่าที่ตกลงกัน การทดสอบ version 2 ตรวจ **backup + refuse** เท่านั้น ไม่อ้างว่าแปลง version 2 เป็น 1 ได้

## โครงสร้างที่เพิ่ม

- `studio/src/core/editor.ts`: สร้าง draft/ports และ atomic Patch จากการกระทำ UI; Rust ตรวจ Schema และความหมายผ่าน Validator ตามเดิม
- `studio/src/core/folder.ts`: picker, recover-before-open, raw backup guard, manual save conflict check และอ่าน asset file
- `studio/src/ui/useStudio.ts`: Core session, last acknowledged snapshot, history counters, save/dirty status และเตือนก่อนออกเมื่อมี Core edits ค้าง
- `App.tsx`, `NodeInspector.tsx`, `StoryCard.tsx`, `Resources.tsx`: หน้าและฟอร์มภาษาไทยตาม DESIGN.md เดิม
- `web/local-folder.d.mts`: TypeScript declaration ของ legacy adapter; ไม่เปลี่ยน implementation ของ transaction 0b

## วิธีใช้

รัน `start-studio.cmd` จาก project root แล้วเปิด URL ใน Chrome/Edge

1. กดเปิดโฟลเดอร์ที่มี project.storyflow.json หรือกรอกชื่อแล้วสร้างในโฟลเดอร์ที่ยังไม่มีไฟล์นี้
2. หน้า Project จัดการตัวละครและลงทะเบียนพาธ เช่น `clips/intro.webm` ซึ่งหมายถึงไฟล์เดิมใน `game/assets/clips/intro.webm`
3. หน้า Story Graph เพิ่มโหนด เลือกจากกราฟหรือ dropdown แล้วกดโฟกัสเมื่อต้องการอ่านใกล้ ๆ
4. แก้ Inspector แล้วกดใช้การแก้ไขโหนด หรือกดแก้ข้อความบนกราฟแล้วใช้ข้อความบนกราฟ
5. เชื่อมพอร์ตจากฟอร์มหรือลาก handle; หากเปลี่ยน entry node ให้ใช้โหนดนี้เริ่มกราฟ ก่อนลบ entry เดิมเลือก entry ทดแทน
6. กดบันทึกโปรเจกต์เมื่อทำงานกับโฟลเดอร์ ตัวอย่าง Summer House อยู่ใน memory และไม่บันทึกลงโฟลเดอร์อื่นให้อัตโนมัติ

## ผลทดสอบและหลักฐาน

- `npm --prefix studio test`: ผ่าน 9/9 รวม transport6 และ editor atomic operations3
- TypeScript / production / proof builds ผ่าน ไม่มี dependency ใหม่
- [Editor E2E](evidence/1.2/editor-browser.json): ผ่าน 11 กลุ่มตรวจบน Edge 157.0.4341.46, 0 uncaught page errors
- [Drag smoke](evidence/1.2/drag-proof.json): pointer drag จริงเปลี่ยนตำแหน่งบน React Flow; ฟอร์มซ้าย/ขวา/ขึ้น/ลงตรวจใน Editor E2E
- [Regression 1.1](evidence/1.2/regression-1.1/browser-proof.json): ผ่าน7กลุ่ม; [20 Worker responses](evidence/1.2/regression-1.1/contract-proof.json) ตรง native CLI แบบ deep equality
- [Static design detector](evidence/1.2/design-detect.json): `[]`; ไม่ใช่การรับรอง accessibility เต็มระบบ
- Contrast จาก tokens: text/background16.12, text/surface13.36, secondary/surface8.35, primary label/accent9.66; keyboard focus ตรวจบน Edge จริง; form controls ใช้36pxขึ้นไป
- ภาพ [1440](evidence/1.2/editor-1440.png), [1000](evidence/1.2/editor-1000.png), [700](evidence/1.2/editor-700.png), [ตัวละคร/สื่อ](evidence/1.2/project-resources-1440.png) ตรวจภาพแล้ว กราฟเป็นพื้นที่ pan/zoom; เมื่อ resize อาจต้องกดโฟกัสหรือ Fit view ใหม่

Editor E2E ใช้ **File System handles ของ OPFS จริง โดย inject เฉพาะ showDirectoryPicker** และใช้ Worker/WASM production จริง ทดสอบ file I/O, source file backup และ conflict ผ่าน browser API ไม่ใช่การเปิด OS picker/ให้สิทธิ์ native folder รอบใหม่ ไม่มีการอ้างผล OPFS แทน native permission evidence 0b

กรณี failure ที่ตรวจ: Core reject startDay=0 แล้วเก็บ draft, missing media, path traversal, unsupported Schema พร้อม backup byte-identical, picker NotAllowedError, write NotAllowedError และ external file conflict ทั้งหมดรักษาไฟล์เดิมหรือ snapshot ที่ยืนยันล่าสุดตามกรณี

## ข้อจำกัดส่งต่อ

- Manual Save เท่านั้น; Autosave/IndexedDB draft/การเปิดซ้อนหลายแท็บเป็น 1.5 ยังไม่รับรองข้อมูลหลัง crash/reload ของการแก้ไขที่ไม่ได้บันทึก
- ตำแหน่งโหนดเป็น view state ของ session ไม่เพิ่ม field ใน Core Schema และยังไม่บันทึกข้ามการเปิดใหม่; Undo/Redo ใน Core ครอบคลุมข้อมูลโปรเจกต์ ไม่ใช่ viewport pan/zoom
- Conditions/Effects builder และ Activities/Events เต็มรูปแบบเป็น 1.3 ขณะนี้รักษาข้อมูลเดิมไว้ ไม่เขียนทับด้วยค่าจากภาพ mockup
- Registry ใช้พาธไฟล์เดิม ผู้ใช้วางสื่อใน game/assets เอง ไม่มีการ import/copy/delete media; browser เป็นผู้เลือก decoder ไม่รับรองทุก codec จากนามสกุลไฟล์
- Web Lock ป้องกันภายใน origin แต่ไม่ล็อก external editor; hash check ตรวจ conflict ก่อนเขียน ไม่ใช่ OS compare-and-swap และไม่รับรอง atomic ข้ามไฟล์
- ไม่วัด P5–P8 ในรอบนี้ และไม่อ้าง performance budgets จาก fixture ขนาดเล็ก
- ภาษา UI ยืนยันแล้ว ส่วน font/brand/semantic colors และ visual tokens ที่ยังค้างไม่ได้ถูกล็อกเพิ่มจากงานนี้
- ไม่ได้รัน SDK parity ใหม่ เพราะ Rust/Core/WASM binary ไม่เปลี่ยน ใช้ 20-message regression ตรวจ transport ที่ได้รับผลจาก UI แทน

## ส่งตรวจรับ

Codex: พัฒนา 1.2.1–1.2.5 ครบและผ่านชุดตรวจที่ระบุ พร้อมข้อจำกัด Native picker และ persistence ข้างต้น

Gemini: รอตรวจ source, gpt.md, checklist และหลักฐานนี้ ไม่แก้สถานะตรวจรับแทน Gemini
