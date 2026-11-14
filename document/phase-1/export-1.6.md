# Phase 1.6 — Export UI, Source Map และ SDK

2026-11-14 · พัฒนาเสร็จ · Codex ตรวจตาม checklist ผ่าน · รอ Gemini ตรวจรับร่วม

ต่อจาก1.5ที่ตรวจรับร่วมแล้วตาม gemini.md/checklist.md ใช้DESIGN.mdและกลไก0bเดิม ไม่เปลี่ยนกติกาเกม ไม่มีdependencyใหม่ ยังไม่ปิดPhase1/Gate1

## ผลตาม checklist

| ขั้น | ผลพัฒนา/ตรวจฝั่ง Codex |
|---|---|
| 1.6.1 | หน้า Export เตรียม bundle จาก Rust/WASM แล้วส่งด้วย LocalProject.exportLocked ภายใต้ storyflow-export lock ใช้ recover/journal/backup/manifest เดิม เพิ่ม query buildExport แบบ additive ใน Contractv1 และย้าย CLI bundle ไป pure Core ฟังก์ชันเดียวกัน |
| 1.6.2 | ต้องเปิดโฟลเดอร์และบันทึก Project ก่อน; Core Validate error หยุดก่อนสร้าง bundle; preflight Project hash ใน lock, generated-file hash, unowned name collision และสื่อไม่พร้อมบล็อกก่อนcommit แสดง error/pathจริง; ไม่มี success เก่าค้างเมื่อเริ่มส่งออกใหม่ |
| 1.6.3 | แสดงไฟล์ที่จะเขียน, Save warning ก่อน/หลัง Subgraph structure เปลี่ยน; Source Map เลือกไฟล์/บรรทัดจาก Ren’Py error→เปิดnode/choiceถูกต้องและดาวน์โหลด JSON ได้ |
| 1.6.4 | เกมใหม่ติดตั้ง template Noto Thai/TCC เดิมแบบpreflightไม่ทับไฟล์; เกมเดิมข้ามtemplateและเชื่อม call sf_entryเอง UIไม่แก้entry/user/media; เกมที่ส่งออกจริง lint/runบนSDK8.3.7ผ่านทั้งสองแบบ พร้อมhash auditนอกgenerated |

## วิธีใช้งาน

1. เปิดโฟลเดอร์โปรเจกต์ แก้และกดใช้ข้อมูล รอ Autosave หรือกดบันทึกจนสำเร็จ
2. เข้า Export: เกมเดิมเชื่อม entry ในสคริปต์ของตนเองด้วย call sf_entry; เกมใหม่ที่ไม่มีสคริปต์ใช้ปุ่มติดตั้งเทมเพลตเกมใหม่ก่อน
3. กดตรวจและเตรียมส่งออก ตรวจรายชื่อไฟล์ คำเตือน Save และ Core Validate แล้วกดส่งออกไปยังโฟลเดอร์นี้
4. หาก hash ขัดแย้ง ระบบแสดงไฟล์ที่ต้องตรวจและไม่เขียนทับ หากเกิด pending transaction/สิทธิ์หลุด กดให้สิทธิ์โฟลเดอร์และกู้ชุดส่งออก แล้วเตรียมส่งออกใหม่
5. เมื่อ Ren’Py แจ้ง error ให้เลือกชื่อ generated file และเลขบรรทัดใน Source Map เพื่อเปิดโหนด/Choice ไม่เดาตำแหน่งจากข้อความบทพูด

## สัญญาและขอบเขตไฟล์

- buildExport query payload{} → projectId/files/sourceMap/subgraphStructure ไม่ทำ I/O ไม่เปลี่ยน Project หรือ RunState; schema, TS types, CoreClient และ README Contractอัปเดตพร้อมกัน
- sf_core::export::export_bundle ใช้ export_renpy/source_map และการคำนวณstructureจาก CLI0bเดิม CLIและWorkerจึงสร้างไฟล์/แผนที่/Save fingerprintแบบเดียวกัน
- Transactionเป็นเจ้าของเฉพาะ game/storyflow_generated/*.rpy + manifest และ .storyflow/sourcemap.json/journal/backups
- Exportเขียนลงโฟลเดอร์ที่เปิดอยู่ ไม่คัดลอกสื่อ ไม่แก้ script.rpy หรือfonts/UIของเกมเดิม; hashไฟล์Projectถูกตรวจซ้ำใน transaction lock
- Templateเป็นการติดตั้งแยกก่อนgenerated transaction: fetchทรัพยากรครบก่อนเขียน ปฏิเสธโฟลเดอร์ที่มีสคริปต์และชื่อไฟล์ชนทั้งหมด ตรวจซ้ำแต่ละไฟล์ก่อนเขียน ไม่ทับของเดิม

## หลักฐานและผลทดสอบ

- [Verification](evidence/1.6/verification.json): production/proofbuildผ่าน; TSunit13/13 และ Rustworkspace13/13; WASM asset39d9c8c997eb6762; detector[]
- [Export Edge E2E](evidence/1.6/export-browser.json): 8กลุ่มผ่าน 0pageErrors บนEdge157 รวมเกมเดิม/repeat/hashconflict/SourceMap/Savewarning/mid-exportdenial/recovery/Projectrevision/namecollision/Coreerrors/เกมใหม่
- [Native bundle](evidence/1.6/native-bundle.json): ทั้ง4 generated files และSourceMapจากUI WorkerตรงCLIทุกฟิลด์
- Auditในexport-browser.json: existingOutsideHashes4ไฟล์และnewOutsideHashes7ไฟล์ก่อน/หลังExportเท่ากันทั้งหมด รวมProject/entry/user/media และtemplate/font/licenses/TCC
- [SDKจริง](evidence/1.6/sdk-export.json): SDK8.3.7.25031702 Windows desktop ไม่มีSDL_VIDEODRIVER=dummy; ทั้งคู่lint/runexit0 Generated .rpy hashesไม่เปลี่ยนระหว่างSDKtest
- เกมเดิมใช้Summer House entryที่เชื่อมเอง ได้ending...0009/day3/affection20/energy80; เกมใหม่ใช้templateจริง ได้EndingตามProjectและscore7จากScene Effects
- SDKdriverเพิ่มไฟล์ทดสอบแยกหลังaudit ไม่แทน label start: entryจริงเรียกsf_entryผ่านtest-onlywrapperครั้งเดียว แล้วรันsf_entryจริง อ่านผล/ออก; เมนูตอบด้วยtestinput ไม่สร้างgeneratorหรือแก้generated.rpy
- [Regression1.1](evidence/1.6/regression-1.1/browser-proof.json): 7กลุ่ม Worker/native22ข้อความ รวมbuildExportก่อนเปิดProjectและbundleปกติ
- [Regression1.2](evidence/1.6/regression-1.2/editor-browser.json): 11กลุ่ม Editor/Folder/media/conflictผ่าน
- [Regression1.3](evidence/1.6/regression-1.3/rules-browser.json): 7กลุ่ม/55messages/10cases/79traceStepsตรงnative
- [Regression1.4](evidence/1.6/regression-1.4/playtest-browser.json): 9กลุ่ม/Trace16ก้าวตรงnative
- [Regression1.5](evidence/1.6/regression-1.5/recovery-browser.json): กลุ่มD8กลุ่มผ่าน
- ภาพ [1440](evidence/1.6/export-1440.png), [1000](evidence/1.6/export-1000.png), [700](evidence/1.6/export-700.png): paletteเดิม/ไม่มีhorizontaloverflow ตรวจภาพแล้ว

รันบนเครื่องอ้างอิง:

```powershell
npm --prefix studio run build
npm --prefix studio test
$env:PYTHONPATH="$PWD/temp/stack-python"
python -u studio/tests/export-proof.py
python -u studio/tests/export-sdk-proof.py
```

ต้องbuildWASMหลังแก้Rustก่อนprepare:core และมีCLI/SDKตามสภาพแวดล้อมในgpt.md ผลSDKอ้างโฟลเดอร์dumpจากExportUIจริงที่ระบุในreport ไม่ใช่CLIสร้างเกมอีกชุดแทน

## ข้อจำกัดและส่งต่อ

- Template initializationแยกจากtransactiongenerated หากปิดหน้าระหว่างติดตั้งอาจเหลือไฟล์templateบางส่วน การลองซ้ำจะหยุดเมื่อพบไฟล์/สคริปต์ ห้ามอ้างว่าขั้นtemplateมีcrash rollbackเหมือนgenerated transaction ให้ตรวจไฟล์ก่อนทำต่อ
- Save warningเป็นความเสี่ยงเมื่อSubgraphstructureเปลี่ยน ไม่รับประกันความเข้ากันได้ทุกSave ไม่อ่าน/แก้ไฟล์Saveของผู้ใช้
- Core/source errorsแสดงตามจริง SourceMapเป็นของbundleที่เตรียมไว้ การแก้Projectจะล้างpreview ต้องเตรียมใหม่; ไม่ map user scriptที่Coreไม่ได้สร้าง
- NativeOSpicker/permissionไม่มีการทดสอบใหม่ ExportE2Eใช้OPFSจริงกับinjectedpicker/write denial; SDKrunเป็นWindowsจริงแยกต่างหาก
- TEST-1.6-RECOVERY: regression1.5มี1รอบกู้ร่างหลังpagecloseแล้วtitleไม่เปลี่ยนใน5sขณะรันSDKพร้อมกัน รอบแยกผ่านโดยไม่เปลี่ยนruntime/timeout เพิ่มcaptureDOM/ภาพ/WebLockถ้าเกิดซ้ำ ยังไม่ยืนยันต้นเหตุ ส่งต่อ1.7
- TEST-1.6-SDK-DRIVER: รอบแรกtest menuคืนChoiceReturnแทนค่าSDK ทำให้error/timeout แก้เฉพาะdriverให้ใช้.value ตามAPI SDKแล้วผ่าน ไม่เปลี่ยนไฟล์เกม; preflighttemplateassert normalizeCRLFของWindows ไม่แก้source
- MainJS~511kBมีViteadvisoryเกิน500kB ไม่ซ่อนwarning ไม่ใช้buildหรือfixtureเล็กแทนเกณฑ์P1–P8 ต้องวัดใน1.7
- 1.7/Gate1ยังไม่เสร็จ ต้องตรวจเส้นทางUIเต็มและperformanceตามมติ0b.5 ไม่อ้างว่าจบMVPจาก1.6
