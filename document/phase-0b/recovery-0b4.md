# Phase 0b.4 · Recovery / กลุ่ม C และ C+

วันที่ 2026-11-12 · พัฒนาเสร็จ / Codex และ Gemini ตรวจรับผ่านร่วมกันแล้ว

## หลักฐานที่ผ่านแล้ว

- [Filesystem regression](evidence/recovery-filesystem-regression.json): 18 checks ผ่าน รวม export ซ้ำ, hash ต่าง, unowned collision, backup เสีย, concurrent recover/export และการรักษาไฟล์ผู้ใช้
- [Browser lifecycle](evidence/recovery-browser-report.json): Edge 157 headless บน Windows ปิด page จริงและปิด persistent browser context ขณะ export หยุดรอหลังปิดไฟล์แรกสำเร็จ แล้วเปิด profile เดิมบน origin เดิม กู้คืนชุดเดิมครบทุก path/hash และ recover ซ้ำเป็น no-op
- Browser permission fault อีกเคส throw DOMException NotAllowedError หลังไฟล์แรก แล้วปิด/เปิด page ใหม่กู้คืนผ่าน **เป็น fault injection ชัดเจน ไม่ใช่ผลถอน grant จริง**

ไฟล์ที่เทียบ 8 รายการ: generated .rpy ทั้ง 4, sf_manifest.json, .storyflow/sourcemap.json, game/user.rpy และ game/assets/probe.webm ก่อนปิด browser ยืนยัน pending=true และ partial snapshot ต่างจาก baseline แล้ว หลังเปิดใหม่ยืนยัน recovered=true, committed=false, equal=true, pending ถูกล้าง และ secondRecovery.recovered=false

## Native test ที่เจ้าของช่วยทดสอบ

ใช้หน้าทดสอบ [recovery-proof.html](../../web/recovery-proof.html), [module](../../web/recovery-proof.mjs) และโฟลเดอร์ temp/0b4-native-root/ โดยสร้าง recovery-UUID แยกในแต่ละรอบ เก็บ directory handle ใน IndexedDB เพื่อกลับมาเปิดใหม่

รอบแรกเจ้าของแจ้ง Error: Recovery did not restore original set ตรวจไฟล์จริงพบ export commit ชุดใหม่ครบและไม่มี pending จึงไม่ใช่กรณีที่ควร rollback ชุดเดิม ไม่ใช้ข้อความ error ของ harness สรุปว่าข้อมูลสูญหาย และไม่ถือว่าพิสูจน์การถอน permission สำเร็จ

แก้ harness ให้ตรวจ queryPermission ก่อน resume: ถ้ายัง granted จะหยุดแจ้งเหตุผล ไม่ปล่อยให้ export จบแล้วตรวจผิดกรณี เพิ่ม diagnostic hadPending/recovery/equal/failure และส่งรายงาน native ไป server

รอบที่ตรวจรับใช้เคส recovery-4c3fef85-2a09-4d82-8cf8-2141a82cf758: หยุดหลังไฟล์แรกพร้อม pending, ปิด browser session เฉพาะโปรไฟล์ทดสอบ แล้วเปิด stored native handle ใน session ใหม่ พบ queryPermission=prompt และ getDirectoryHandle คืน NotAllowedError จริง ไม่ override permission และไม่ throw exception จำลอง ดู [native reopen permission](evidence/native-reopen-permission.json)

## วิธีรันซ้ำแบบปิด page จริง

เตรียม directory เว็บใหม่ด้วย recovery-proof.html, recovery-proof.mjs, local-folder.mjs, bundle.json จาก CLI และ probe.webm แล้วใช้ Python Playwright/Edge:

```powershell
python scripts/test-recovery-browser.py temp/0b4-browser
```

สคริปต์เปิด HTTP origin ชั่วคราว คง port เดิมตลอดการปิด/เปิด context และเขียน recovery-browser-report.json ไม่เชื่อมต่อโฟลเดอร์ข้อมูลผู้ใช้

Native interactive: `node web/serve-proof.mjs temp/0b4-browser 8767` → เปิด recovery-proof.html → เลือก dedicated folder → หลัง paused ถอนสิทธิ์/ปฏิเสธ permission prompt → เขียนต่อให้ได้ NotAllowedError → ให้สิทธิ์ใหม่และกู้คืน รายงานสำเร็จต้องมี failure จริง, hashes เท่าชุดเดิม และ pending ถูกล้าง

## ข้อจำกัด

- OPFS เป็น browser filesystem จริง แต่ไม่แทน native OS folder permission
- Web Locks ไม่ล็อกโปรแกรมภายนอก browser; ไม่รับประกัน atomicity ข้ามทั้งชุดขณะที่ SDK อ่านระหว่าง export
- การจัดการ grant/revoke ใน UI ให้เจ้าของทำ ตาม computer-use guidance ที่ห้าม act on security/privacy permission requests; agent ทำ harness และอ่านหลักฐานได้
- ผล Native ครบแล้วตาม audit ด้านล่าง การตรวจรับนี้รวม actual permission unavailability หลัง browser session สิ้นสุด ไม่ได้อ้างว่า automate ปุ่ม revoke ใน browser settings

## ผล Native หลังเจ้าของ regrant · ผ่าน

เจ้าของให้สิทธิ์ผ่าน browser UI แล้ว [filesystem audit](evidence/native-recovery-audit.json) ยืนยันครบ 8 SHA-256 เท่ากับ baseline และไม่มี pending รวมไฟล์ user.rpy และ probe.webm ที่ต้องไม่สูญหาย

การกู้คืนครั้งถัดไปในหน้าเดิมเคยถูก harness แจ้ง not-a-rollback-case เพราะไม่มี pending แล้ว แม้ equal=true: เป็นข้อผิดพลาดในเกณฑ์ตรวจการเรียกซ้ำ ไม่ใช่ storage recovery ล้มเหลว เก็บ [raw last UI response](evidence/native-recovery-last-ui-report.json) ตามจริงไว้ ไม่อ้างว่าเก็บ first recovered:true response ซึ่งถูกการเรียกซ้ำเขียนรายงานทับ

แก้ harness ให้ no pending + hashes ตรงเป็น alreadyRestored และ disable ปุ่มระหว่างกู้คืน/หลังสำเร็จ; ห้ามเรียก recover รอ lock ในหน้าเดียวกับ writer ที่หยุดค้าง ให้ปิดหน้าแล้วเปิดใหม่ก่อน การทดสอบ browser รุ่นสุดท้ายยืนยัน first recovery จาก pending และการเรียกซ้ำเป็น alreadyRestored ผ่านแล้ว

หลักฐาน Native รวมกันคือ: transaction เคยหยุดหลังแทนไฟล์บางส่วน, permission หายจริงใน session ใหม่, เจ้าของ regrant, เนื้อหาและ metadata บนดิสก์กลับเป็น baseline ครบ 8 รายการ และ journal ถูกล้าง Audit ระบุข้อจำกัดของ raw UI response ชัด ไม่ใช้ fault injection มาอ้างแทน grant จริง

## สรุปตรวจรับ Codex

- [x] 0b.4.1 baseline/hash ครบ
- [x] 0b.4.2 ส่งออกซ้ำ/hash ต่าง/ชื่อชนผ่านใน regression 18 checks
- [x] 0b.4.3 ปิด page/context จริง และ native permission หายจริงหลังปิด session ขณะที่ pending ยังอยู่
- [x] 0b.4.4 เปิดใหม่/regrant แล้วตรวจไฟล์ทั้งชุดและไฟล์ผู้ใช้ตรงเดิม; กู้ซ้ำไม่แจ้งผิด

ผลนี้ไม่รับรอง browser ทุกยี่ห้อหรือ OS ทุกระบบ และไม่ใช่ผลตรวจ UI MVP ซึ่งยังไม่สร้าง