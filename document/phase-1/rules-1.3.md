# Phase 1.3 · Variables, Conditions, Effects และ Schedule

2026-11-12 · Codex พัฒนาเสร็จและตรวจตามหลักฐานด้านล่าง รอ Gemini ตรวจรับร่วม

ก่อนเริ่มอ่านผลรับ 1.2 ใน gemini.md/checklist.md และ cleanup บันทึกงานที่ปิดใน gpt.md แล้ว ใช้ภาษาไทย คงศัพท์เทคนิคอังกฤษ และ DESIGN.md เดิม ไม่เปลี่ยน Core Contract หรือ Rust/WASM binary

## ผลตาม checklist

| รายการ | ผลพัฒนา |
|---|---|
| 1.3.1 Variables / Condition Builder | เพิ่ม/แก้/ลบ int, bool, string พร้อม initial และ min/max ของ int; AST แบบ recursive all/any/not/compare รองรับ day, variable, typed literal และ eq/ne/lt/le/gt/ge; สลับ AND/OR คงเงื่อนไขย่อย |
| 1.3.2 Effects / visibleIf | reusable Effects editor สำหรับ scene, choice, effect node และ activity; set/add/subtract ตามชนิดตัวแปร จัดลำดับ effects ได้; visibleIf และ branch condition แก้ผ่านฟอร์ม ไม่ต้องแก้ JSON |
| 1.3.3 Activities / Events / Subgraph | condition, effects, optional Activity Subgraph; Event phase/priority/order/once/condition/Target Subgraph; ลบ Activity/Event พร้อม memberships ใน Patch เดียว; Variable ที่ถูกอ้างอิงหยุดลบพร้อมแสดงพาธ |
| 1.3.4 Schedule | startDay/lastDay inclusive, เลือก Activity/Event memberships และ onComplete; ใช้ ScheduleFields เดียวกันใน Rules และ Inspector; memberships ที่ขาดจากไฟล์ภายนอกเอาออกผ่าน UI ได้ |
| 1.3.5 Summer House | เริ่มจาก graph skeleton ที่ล้างกติกา แล้วสร้าง Variables, Activities, Events, Branch, Effects, Choices และ Schedule จาก UI จนครบ; Project ตรง fixture หลัง map UUID และ Validate ไม่พบปัญหา |

Event ใช้ phase ตาม Schema: before_activity, after_activity, end_of_day; Core เรียง priority มากก่อน แล้ว order น้อยก่อน UI ไม่เพิ่ม enum จากข้อความใน mockup

## โครงสร้างและวิธีใช้

- `RuleFields.tsx`: Integer/Scalar inputs, recursive Condition Builder, ordered Effects และ Subgraph selector
- `RulesPane.tsx`: แท็บ Variables / Daily Schedule / Events พร้อมผล Validate ของ snapshot ที่ Core ยืนยัน; keyboard Arrow/Home/End ใช้กับแท็บได้
- `ScheduleFields.tsx`: ฟอร์มวันและ memberships ใช้ร่วม Rules/Inspector
- `core/rules.ts`: สร้างรูปแบบ AST/defaults และค้น references เพื่อจัด Patch เท่านั้น ไม่มีการประเมินเงื่อนไขหรือคำนวณ effects แทน Rust
- `core/editor.ts`: เปลี่ยน target ของ edge เดิมโดยคง UUID และตำแหน่งใน array ไม่ย้าย edge ไปท้ายโดยไม่จำเป็น

เปิดโปรเจกต์หรือตัวอย่าง แล้วเลือก **Rules & Schedule** ตั้งค่าในแท็บต่าง ๆ กดใช้ตัวแปร/กิจกรรม/Event/Schedule ก่อนกดบันทึกโปรเจกต์ เงื่อนไขของฉาก/choice/branch และ effects ของโหนดอยู่ใน Story Graph Inspector

เลือก `ไม่มีเงื่อนไข` สำหรับกิจกรรม fallback โดยตรง; all ว่างเป็นจริงแต่ไม่ใช่ null ที่กติกา fallback กำหนด เมื่อเปลี่ยนชนิด Condition ข้ามรูปแบบเช่น compare → not จะเริ่ม fields ใหม่ ส่วน all ↔ any เก็บ conditions เดิม การแก้ draft จะเข้า Core เมื่อกดใช้เท่านั้น

## ผลทดสอบ

- TypeScript / production / proof builds ผ่าน ไม่มี dependency ใหม่
- Unit **13/13**: transport6 + editor3 + rules4 ครอบคลุม references ใน AST ซ้อนกัน, literal UUID ที่ไม่ใช่ reference, cascade memberships, typed defaults และ AND/OR preservation
- [Rules E2E](evidence/1.3/rules-browser.json): **7 กลุ่มตรวจ**, Edge 157.0.4341.46, 0 uncaught page errors
- [UI-generated Project](evidence/1.3/ui-project.json), [UUID-normalized Project](evidence/1.3/normalized-project.json): เทียบ Project ทั้งชุดกับ Summer House fixture ตรงกัน ไม่แก้กติกาผ่าน JSON editor
- [Core parity](evidence/1.3/core-parity.json): ใช้ Project จาก UI รัน Worker **55 ข้อความ / 10 เคส / 79 ก้าว** เทียบ native CLI กับ fixture เดิม ครบทุก field รวม RunState, Trace และ ExplainCondition
- [Regression 1.1](evidence/1.3/regression-1.1/browser-proof.json): 7 กลุ่มผ่าน รวม 20 messages ตรง native และ WASM failure/restart
- [Regression 1.2](evidence/1.3/regression-1.2/editor-browser.json): 11 กลุ่มผ่าน รวม atomic Undo, manual save, conflict, permission injection, media และ draft retention
- [Static design detector](evidence/1.3/design-detect.json): `[]`; ไม่แทน accessibility audit เต็มระบบ ใช้ tokens/contrast เดิมและ form controls 36px ขึ้นไป

การเทียบ UUID จำเป็นเพราะ UI สร้าง UUID ใหม่ให้กติกา มีการ map UUID ใน keys/values และ `ExplainCondition.expression` ซึ่งเป็น serialized JSON AST ด้วย เก็บ AST ทุก field ไม่ตัด expression หรือเปลี่ยนผลเงื่อนไขออกจากการเทียบ ทั้ง raw/reference responses เก็บให้ตรวจซ้ำ

E2E ตรวจ bool/string และ typed Effects, NOT/ANY, choice effects, Undo/Redo, หยุดลบ referenced variable, invalid i32 draft ที่ยังคงค่าพิมพ์, ลบ Event/Activity พร้อม memberships และ V005 เมื่อเอา fallback ออก แล้ว Undo คืนได้

## ภาพและการตรวจซ้ำ

[Variables](evidence/1.3/variables-1440.png) · [Daily Schedule](evidence/1.3/daily-schedule-1440.png) · [Events 1440](evidence/1.3/events-1440.png) · [1000](evidence/1.3/events-1000.png) · [700](evidence/1.3/events-700.png)

ตรวจภาพแล้ว ข้อความไทยและ nested fields ไม่เกิด horizontal page overflow; AST ยาวใช้ vertical scroll ตาม layout เดิม ภาพหลังทดสอบมี bool/string เพิ่มจาก canonical fixture เพื่อแสดง controls แต่ไฟล์ UI-generated Project สำหรับ parity เก็บก่อนเพิ่มเคสเหล่านั้น

```powershell
npm --prefix studio test
npm --prefix studio run build
npm --prefix studio run proof:build
$env:PYTHONPATH = "$PWD/temp/stack-python"
python -u studio/tests/rules-proof.py
$env:SF_EDITOR_PROOF_OUT = 'document/phase-1/evidence/1.3/regression-1.2'
python -u studio/tests/editor-proof.py
$env:SF_PROOF_OUT = 'document/phase-1/evidence/1.3/regression-1.1'
python -u studio/tests/browser-proof.py
```

ต้องมี sf-cli และ sf-wasm ที่ build ตาม studio/README.md ผล regression แยก directory ไม่เขียนทับหลักฐาน 1.1/1.2 ที่ตรวจรับแล้ว

## ข้อจำกัดและข้อสังเกตส่งต่อ

- ยังเป็น manual Save; form drafts ต้องกดใช้ก่อนบันทึก Autosave/IndexedDB เป็น 1.5 ส่วน Playtest/Diagnostics UI เป็น 1.4 และ Export UI เป็น 1.6
- UI ประกอบ AST/Effects และแสดงผล Validate ของ Core ไม่ประเมินเงื่อนไขหรือ preview clamp ด้วย JavaScript การเปลี่ยน Variable type ไม่แก้ความหมายของ references ให้เอง ต้องตรวจ Validation และแก้กติกาที่ใช้
- Browser tests ใช้ OPFS handles จริงและ injected picker ไม่ใช่ OS native permission test รอบใหม่; การเชื่อมโฟลเดอร์จาก 1.2 ไม่เปลี่ยน
- Regression เคยพบหลัง WASM restart เปิด fixture แล้วรอ nodes เกิน assertion 5s หนึ่งรอบ รันซ้ำผ่าน และ [ทวน 3 sessions](evidence/1.3/restart-repeat.json) ผ่านด้วย timeout เดิม โดยไม่แก้ runtime หรือเพิ่ม timeout; ยังไม่ยืนยันต้นเหตุ จึงไม่อ้างว่าแก้ root cause แล้ว
- Samples การเปิดหลัง restart ประมาณ 1.40–2.44s รวมการกดและรอ DOM เป็น smoke เท่านั้น ไม่ใช่ P1/P5 benchmark; P1–P8 ตรวจตาม protocol ในขั้นประสิทธิภาพ ไม่รับรองจากรอบนี้
- Rust/Core/WASM binary ไม่เปลี่ยน ไม่รัน Ren’Py SDK parity ใหม่ ใช้ Worker/native parity ของ UI-generated rules และหลักฐาน SDK เดิมเป็นคนละชั้นการตรวจ

Codex: พัฒนา 1.3.1–1.3.5 เสร็จ พร้อมหลักฐานและข้อสังเกตข้างต้น

Gemini: รอตรวจ source, gpt.md, checklist และรายงานนี้ ไม่แก้สถานะตรวจรับแทน Gemini
