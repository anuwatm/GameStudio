# Phase 1.4 — Playtest และ Diagnostics

พัฒนาเสร็จ 2026-11-13 · ตรวจรับร่วม Codex/Gemini ผ่าน 2026-11-14 ตาม gemini.md และ checklist.md

ต่อจาก 1.3 ที่ตรวจรับร่วมแล้วตาม gemini.md และ checklist.md ใช้ DESIGN.md/impeccable/design-md เดิม ไม่มี dependency ใหม่ ไม่เปลี่ยน Rust, Contract, WASM หรือกติกาเกม

## ผลตาม checklist

| รายการ | ผลพัฒนาและตรวจฝั่ง Codex |
|---|---|
| 1.4.1 | เริ่มจาก Entry หรือโหนดที่เลือก รวม Subgraph ผ่าน startPlaytest; Project snapshot อยู่แยก RunState เปิดโปรเจกต์/เริ่ม Core ใหม่ล้าง run |
| 1.4.2 | Activity และ Choice มาจาก visibleChoices ของ Core ส่ง choose กลับ Core; แสดงวัน บทพูดผู้บรรยาย/ตัวละคร และ Ending ตาม trace |
| 1.4.3 | ExplainCondition แสดง result/expression/operands; เปรียบเทียบตัวเลขแบบ ge/gt มีส่วนต่างเพื่ออธิบาย แสดง StepTrace พร้อม varsBefore/After, conditionResults, AST จาก snapshot, และ JSON ทั้ง 12 ฟิลด์ ดาวน์โหลดผ่าน getTrace กดกลับโหนด/Choice ได้ |
| 1.4.4 | SetVar int/bool/string และ Rewind ใช้ Core; error เก็บผลสำเร็จล่าสุด โปรเจกต์/dirty/Undo ไม่เปลี่ยน การแก้โปรเจกต์ระหว่างเล่นไม่เปลี่ยน snapshot พร้อมแจ้งให้เริ่มใหม่ |
| 1.4.5 | หน้า Validate แสดง Diagnostics จาก Core severity/code/message/nodeId เปิด graph/เลือกโหนดต้นเหตุได้ รองรับไม่พบปัญหา, V002/error, V011/warning และปัญหาระดับโปรเจกต์ที่ไม่มี nodeId |

## วิธีใช้

1. เปิดผ่าน start-studio.cmd แล้วเปิดโฟลเดอร์โปรเจกต์หรือเปิดตัวอย่าง
2. เข้า Playtest กดเริ่มจาก Entry หรือเลือกโหนดใน Story Graph แล้วกด Playtest จากโหนดนี้
3. เลือก Activity/Choice ตรวจค่าจำลอง เหตุผลเงื่อนไข และขยายแต่ละก้าวใน Step Trace
4. ใช้ SetVar หรือ Rewind เพื่อทดลองค่าใหม่ ดาวน์โหลด Trace JSON เมื่อต้องการเทียบผล
5. เข้า Validate กดตรวจโปรเจกต์ แล้วกดเปิดโหนดต้นเหตุเพื่อแก้ Inspector

ตำแหน่งกราฟ/บทพูดเป็นการแสดงข้อมูล snapshot ไม่ใช่การจำลอง Ren’Py renderer ส่วนสื่อใช้หน้า Resources เดิม ไม่มี Autosave/Export UI ในขั้นนี้

## หลักฐานและวิธีทดสอบ

- npm --prefix studio run build และ npm --prefix studio run proof:build ผ่าน
- npm --prefix studio test ผ่าน 13/13
- [Edge E2E 1.4](evidence/1.4/playtest-browser.json): 9 กลุ่มตรวจ, 0 page errors, Edge 157.0.4341.46; Entry, selected Subgraph, Activity/Event/Choice/Ending, SetVar/Rewind failures, snapshot isolation, threshold19/20, Diagnostics และ typed bool/string
- [Trace จาก UI](evidence/1.4/ui-trace.json): 16 ก้าว ทุกฟิลด์ตรง native CLI จาก [ข้อความต้นทาง](evidence/1.4/ui-trace-messages.json)
- [Regression 1.1](evidence/1.4/regression-1.1/browser-proof.json): 7 กลุ่ม รวม Worker/native20ข้อความ, missing FSA และ WASM HTTP failure/restart
- [Regression 1.2](evidence/1.4/regression-1.2/editor-browser.json): 11 กลุ่ม รวม Editor/Storage/media/conflict และ permission failure แบบ injected
- [Regression 1.3](evidence/1.4/regression-1.3/rules-browser.json): 7 กลุ่ม, UI-generated Summer House ตรง fixture; Worker/native55ข้อความ/10เคส/79ก้าว
- [Design check](evidence/1.4/design-check.json): detector ไม่มี findings, Tab focus มองเห็น, 1440/1000/700px ไม่มี horizontal overflow
- ภาพ [1440](evidence/1.4/playtest-1440.png), [1000](evidence/1.4/playtest-1000.png), [700](evidence/1.4/playtest-700.png), [Diagnostics](evidence/1.4/diagnostics-1440.png)

รัน E2E บนเครื่องอ้างอิง PowerShell:

```powershell
$env:PYTHONPATH="$PWD/temp/stack-python"
python -u studio/tests/playtest-proof.py
```

Regression เก็บคนละโฟลเดอร์กับ baseline โดยใช้ SF_PROOF_OUT, SF_EDITOR_PROOF_OUT และ SF_RULES_PROOF_OUT ตามชื่อ test driver ไม่เขียนทับหลักฐานตรวจรับก่อนหน้า

## ข้อจำกัดที่ส่งต่อ

- Core ล้าง ExplainCondition เมื่อเริ่ม automatic step จึงคืน expression/operands เฉพาะจุดประเมินล่าสุด ไม่ได้คืนประวัติเหตุผลทุกก้าว UI แสดงตามจริง; ย้อนตรวจผลผ่าน/ไม่ผ่านจาก conditionResults, AST จาก Project snapshot และ varsBefore/After ใน Trace ไม่ eval เกมซ้ำ ไม่สร้าง operands ย้อนหลังที่ไม่มีใน Contract
- Rewind นับ checkpoint ของ Core ไม่ใช่จำนวนครั้งกด Choice; ไม่มีประวัติพอให้แสดง CORE_ERROR โดยผลสำเร็จเดิมยังอยู่
- เริ่มตรง return node โดยไม่มี subgraph call อาจได้ Return without an active subgraph call ตามกติกา Core ไม่สร้าง caller จำลองเอง
- โหนดที่ถูกลบหลังเริ่ม snapshot จะเปิดกลับในโปรเจกต์ล่าสุดไม่ได้ UI แจ้งข้อผิดพลาดและคง run เดิม
- ข้อมูล Playtest อยู่ใน memory; reload/restart ต้องเริ่มใหม่ การกู้ร่างเป็น1.5 ส่วน Export UI เป็น1.6
- รอบนี้ใช้ OPFS handles จริงกับ injected picker ไม่ใช่การตรวจ native OS picker/permission ใหม่ ไม่มีการรัน SDK parity ใหม่เพราะไม่เปลี่ยน Core/WASM
- TEST-1.3-RESTART: regression1.1 รอบนี้ผ่าน กรณีเคย assertion5s fail ยังไม่ยืนยันต้นเหตุ ไม่ถือว่าแก้ OS/runtime แล้ว
- ไม่มีการรับรอง P1–P8 จากภาพหรือ fixture เล็ก ต้องวัดตามมติ0b.5 ใน1.7
