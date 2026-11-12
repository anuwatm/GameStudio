# Core Contract v1 · Phase 0a.2

อ้างอิง [Concept v2](../StoryFlow-Game-Studio-Concept.md) และ [ข้อตัดสินใจ 0a.1](../document/phase-0a/decisions-0a1.md)

- `project.schema.json` ตรวจรูปร่างเอกสาร `schemaVersion: 1` ส่วน ID อ้างอิง พอร์ต ชนิดตามตัวแปร และข้อจำกัดข้ามฟิลด์ใช้ Validator ใน 0a.4
- `worker.schema.json` กำหนด payload และ Result รายคำสั่ง ผูกคำตอบด้วย `requestId` และชื่อคำสั่ง การแก้ไขใช้ patch แบบ add/replace/remove และตอบ snapshot หลังแก้ ตัวโหลด schema ต้องลงทะเบียน project และ step-trace ตาม `$id` ภายในเครื่อง ดูตัวอย่างใน `fixtures/worker-messages.json`
- `step-trace.schema.json` ใช้ 12 ฟิลด์ตาม §8 เก็บรุ่น SDK แยก เทียบ JSON ทีละก้าวตามลำดับ โดยคงลำดับ visibleChoices
- ใช้ `before_activity` ตาม Concept และข้อตัดสินใจ 0a.1 ฉบับแก้ไข
- `summer-house-cases.json` มี 10 เคสย่อย ให้ใช้ `projectPatch` กับสำเนาโปรเจกต์ ตั้งจุดเริ่มและตัวแปรตาม UUID แล้วป้อน `inputs` ตามลำดับจนจบ แต่ละ assertion ต้องตรงกับแถว Trace อย่างน้อยหนึ่งแถว โดยเทียบฟิลด์ย่อยของ object และเทียบ array ตามลำดับแบบครบรายการ ถ้ามี `count` ให้ตรวจจำนวนแถวที่ตรงเท่ากับค่านั้น การเทียบ Trace เต็มชุดระหว่าง Core กับ SDK อยู่ใน 0a.6
- `validator-cases.json` ใช้ Summer House เป็นฐาน กรณีผิดใช้ RFC 6902 patch แต่ละชุดแยกกัน ตรวจรหัสและ severity ที่ระบุ โดย Validator จริงอยู่ใน 0a.4
- สร้างกราฟวัด baseline ด้วย `node contract/fixtures/generate-baseline.mjs` แล้วเก็บ stdout เป็น JSON กราฟมี 2,000 โหนดและ 1,999 เส้นเชื่อม

สำหรับ V021 กำหนด `shortId` เป็นเลขฐานสิบหก 12 ตัวท้ายของ UUID แบบ lowercase ตรวจชื่อชนหลังเติม kind ตาม Concept ผลตรวจ semantic ทุกคู่ผ่านใน 0a.4 ด้วย [ชุดทดสอบ Rust](../crates/sf-core/tests/phase_0a4.rs)

| กฎ | กรณีผิด | ผลคาดหวัง | ผลจริง |
|---|---|---|---|
| V001 | รหัสซ้ำ | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V002 | next ขาด | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V003 | onComplete ขาด | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V004 | fallback ขาด | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V005 | ไม่มีกิจกรรมสำรอง | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V006 | Event priority/order ซ้ำในเฟสเดียวกัน | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V007 | lastDay ต่ำกว่า startDay | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V008 | Subgraph กระโดดออก | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V009 | ชนิดตัวแปรผิด | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V010 | ปลายทางไม่มีอยู่ | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V011 | ฉากเข้าไม่ถึง | valid ไม่มีรหัสนี้, invalid ได้ warning | ผ่าน 0a.4 |
| V012 | พาธสื่อออกนอกโฟลเดอร์ | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V013 | Schedule ใน Subgraph | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V014 | AST เทียบคนละชนิด | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V015 | Effect add ใช้ operand ผิดชนิด | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V016 | branch ขาด false | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V017 | effect ขาด next | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V018 | choice ขาดเส้นเชื่อม | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V019 | return ใน main | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V020 | initial อยู่นอกขอบเขต | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
| V021 | shortId ชน | valid ไม่มีรหัสนี้, invalid ได้ error | ผ่าน 0a.4 |
