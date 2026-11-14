# Phase 1.5 — Autosave, IndexedDB Recovery และ Web Locks

2026-11-14 · พัฒนาเสร็จ · Codex ตรวจผ่าน · รอ Gemini ตรวจรับร่วม

ต่อจาก1.4ที่ตรวจรับร่วมแล้วตาม gemini.md/checklist.md ใช้กติกาConcept§3.11 และDESIGN.mdเดิม ไม่มีdependencyใหม่ ไม่เปลี่ยนRust/Contract/WASM และไม่เริ่มExporter1.6

## Checklist และผลตรวจ

| ขั้น | ผลพัฒนา/ตรวจฝั่ง Codex |
|---|---|
| 1.5.1 | หลัง Core ยืนยัน Patch/Undo/Redo เก็บ Project ใน IndexedDB ก่อน Autosave ~2s; Project ID เป็น key, sourceRevision เป็น SHA-256 ของไฟล์ต้นทาง, revision ของร่างเป็น UUID; บันทึกเฉพาะ snapshot ล่าสุด ลบร่างแบบ compare-and-delete ตาม revision ที่บันทึกสำเร็จ |
| 1.5.2 | แยก Core status จาก Save status: กำลังบันทึก/บันทึกแล้ว/กู้คืนได้/ล้มเหลว; สิทธิ์หลุดหยุด Autosave และคงร่าง มีปุ่มให้สิทธิ์ใหม่จากผู้ใช้; quota/IDB failure เก็บ memory แต่ไม่อ้างว่าร่างปลอดภัยและไม่เขียนดิสก์จนเก็บร่างได้ |
| 1.5.3 | เปิดใหม่พบร่างจาก IndexedDB; กู้กับต้นทางเมื่อ hash ตรงกัน ถือ Web Lock ตาม Project ID ตลอด session แท็บซ้อนถูกบล็อกก่อน Core เปิดโปรเจกต์ เปลี่ยนโปรเจกต์/ปิดหน้าปล่อย lock; ทดสอบสอง page จริงและปิดหน้าเจ้าของจริง |
| 1.5.4 | Hash conflict หยุดเขียน; Recovery ตรวจ hash อีกครั้งก่อนใช้ต้นทาง หากไฟล์เปลี่ยนจะเปิดร่างเป็นสำเนา Project ID ใหม่ ไม่ผูกโฟลเดอร์ ไม่แก้ไฟล์ภายนอก; Undo หลัง conflict ไม่อ้างบันทึกแล้ว และ Redo กู้ local draft กลับได้ |

Undo กลับ baseline ที่บันทึกแล้วจะลบร่างเก่า ป้องกันกู้ข้อมูลที่ถูก Undo ไปแล้ว ส่วน Playtest/SetVar/Rewind ไม่สร้างการแก้ไขโปรเจกต์

## การใช้งาน

1. เปิดโฟลเดอร์และแก้ข้อมูล กดใช้ในฟอร์มก่อน การพิมพ์ draft ในฟอร์มที่ยังไม่กดใช้ยังไม่ใช่ Core snapshot ที่บันทึกได้
2. เมื่อ Core ยืนยันแล้ว UI เก็บร่าง IndexedDB และแสดงกู้คืนได้ จากนั้น Autosave หลังหยุดทำงานราว2วินาที ปุ่มบันทึกเดิมยังใช้บันทึกทันทีได้
3. หลังเปิดหน้าใหม่ ขยายร่างที่กู้คืนได้ แล้วกดกู้คืนร่าง ระบบขอสิทธิ์โฟลเดอร์อีกครั้งเมื่อจำเป็น
4. หากเปิดโฟลเดอร์แล้วพบร่างต่างจากไฟล์ ระบบรอให้เลือกกู้คืน/เปิดสำเนา หรือยืนยันทิ้งร่างเพื่อเปิดไฟล์บนดิสก์ ไม่เขียนทับร่างเงียบ ๆ
5. หากสิทธิ์หลุด กดให้สิทธิ์โฟลเดอร์ใหม่และบันทึก หากเกิด conflict ให้เปิดร่างเป็นสำเนา แล้วตรวจข้อมูลกับไฟล์ต้นทาง

สำเนาที่กู้คืนไม่มีโฟลเดอร์ผูกอยู่และเก็บต่อใน IndexedDB จึงไม่บันทึกลงต้นฉบับอัตโนมัติ ไม่คัดลอกไฟล์สื่อ และยังไม่มี Save As/Export UI ในขั้นนี้

## โค้ดและข้อมูล

- studio/src/core/recovery.ts: IndexedDB storyflow-recovery/drafts; row = project, sourceRevision, revision, updatedAt, root handle; Web Lock storyflow-project:<ProjectID> แบบ ifAvailable ไม่รอคิวเงียบ ๆ
- studio/src/ui/useStudio.ts: lease, checkpoint ก่อน disk, debounce, recovery และการหยุดเมื่อสิทธิ์/hash ขัดแย้ง
- studio/src/core/folder.ts: RevisionConflict ก่อน atomic project write; ใช้ storyflow-export lock และ recover-before-open/save เดิมร่วมกัน
- studio/src/ui/RecoveryPanel.tsx: สถานะ/รายการร่าง/กู้คืน/สำเนา/ทิ้งร่าง/ขอสิทธิ์ใหม่
- ไม่มีการเพิ่ม revision ลง JSON Schema ของ Core; revision ทั้งสองอยู่ใน persistence metadata

## หลักฐาน

- [Build/unit/design](evidence/1.5/verification.json): production build, proof build และ unit13/13ผ่าน; detector[]
- [Recovery E2E](evidence/1.5/recovery-browser.json): Edge157 ผ่าน8กลุ่ม 0pageErrors; IDBก่อนdisk, debounceล่าสุด, ปิดpageจริงก่อนAutosaveแล้วกู้, WebLockสองแท็บ, สิทธิ์หลุด/regrant, externalconflict/สำเนา, revisionเปลี่ยนขณะปิดหน้า, IDBquota และUndo baseline
- [Regression1.1](evidence/1.5/regression-1.1/browser-proof.json): 7กลุ่ม, CoreClient/native20ข้อความ และ Worker fail/restartผ่าน
- [Regression1.2](evidence/1.5/regression-1.2/editor-browser.json): 11กลุ่ม Editor/Folder/Media/permissions/conflictผ่าน
- [Regression1.3](evidence/1.5/regression-1.3/rules-browser.json): 7กลุ่ม, UI-generated Summer House ตรงfixture; Worker/native55ข้อความ/10cases/79traceSteps
- [Regression1.4](evidence/1.5/regression-1.4/playtest-browser.json): 9กลุ่ม, Trace16ก้าวตรงnativeCLI, typedSetVar/Rewind/Diagnosticsไม่เปลี่ยนProject
- ภาพ [1440](evidence/1.5/recovery-1440.png), [1000](evidence/1.5/recovery-1000.png), [700](evidence/1.5/recovery-700.png): paletteเดิม ไม่มี horizontal overflow ตรวจภาพแล้ว

รันบนเครื่องอ้างอิง:

```powershell
npm --prefix studio test
npm --prefix studio run build
$env:PYTHONPATH="$PWD/temp/stack-python"
python -u studio/tests/recovery-proof.py
```

Regression ใช้ SF_PROOF_OUT / SF_EDITOR_PROOF_OUT / SF_RULES_PROOF_OUT / SF_PLAYTEST_PROOF_OUT ชี้เข้า evidence/1.5/regression-* ไม่เขียนทับbaselineที่ตรวจรับเดิม

## ข้อจำกัด/ส่งต่อ

- Web Locks และ IndexedDB อยู่ใน origin/profile/storage partition เดียวกัน ไม่ล็อก external editor หรือคนละ browser/profile; ใช้ URL/port เดิมเพื่อเห็นร่างเดิม
- IndexedDB อาจถูกล้างหรือ browser eviction ได้ ไม่ใช่ backup ถาวร; UI แสดงกู้คืนได้หลัง transaction สำเร็จเท่านั้น ยังต้องบันทึกลงโฟลเดอร์
- เก็บเฉพาะ Core snapshot ที่กดใช้แล้ว ไม่รวมค่าที่กำลังพิมพ์ค้างในฟอร์ม ตำแหน่ง node และ RunState/Playtest ยังเป็น session state
- เปรียบเทียบ hash ก่อนเขียนช่วยหยุดไฟล์ที่แก้แล้ว แต่ไม่มี OS lock ต่อ external editor ที่แก้ระหว่าง preflight/write
- ทดสอบ IDB/WebLocks/OPFS จริงและ page close จริง; picker/permission denial/regrant/quota ใช้ injection ไม่อ้างเป็นการตรวจ native OS permission ใหม่ อ้างbaseline0bต่อไป
- TEST-1.5-INLINE: regressionEditorครั้งหนึ่งรอปุ่ม inlineแล้วtimeoutขณะ Core/IDB ยังไม่จบ ปรับ driver ให้รอ .session-status พร้อมก่อนเริ่ม inline; รอบถัดผ่าน ไม่เพิ่มtimeout/ไม่อ้างแก้ต้นเหตุbrowserแล้ว
- Buildสุดท้ายลบ import/setterAPI ที่ไม่ใช้ ป้องกัน bypass persistence; ไม่เปลี่ยนพฤติกรรมที่ตรวจแล้ว ไม่มีการรัน SDK parity ใหม่หรือรับรอง P1–P8; Gate1 ยังรอ1.6/1.7
