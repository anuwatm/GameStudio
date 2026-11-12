# 0a.1 · บันทึกข้อตัดสินใจปิดประเด็นเปิด (§8) และสถานะอนุมัติ (§6)

**วันที่ยืนยันและตรวจรับ:** `2026-11-10`  
**ผู้ตัดสินใจ (Project Owner):** `anuwat`  
**ผู้จัดทำและตรวจรับ:** Codex (`gpt.md`) และ Gemini (`gemini.md`)  
**อ้างอิง:** [StoryFlow-Game-Studio-Concept.md (§6 และ §8)](../../StoryFlow-Game-Studio-Concept.md#L328-L384), [checklist.md (`0a.1.1`–`0a.1.4`)](../../checklist.md#L37), [trace-spike.md](trace-spike.md)

---

## 1. สถานะอนุมัติ 14 รายการตาม Concept §6.1–§6.2 (`0a.1.1`)

เจ้าของโครงการ (`anuwat`) ยืนยันอนุมัติครบทั้ง **14 รายการ** เมื่อ `2026-11-10` และอนุญาตให้ Agent ตัดสินใจรายละเอียดทางเทคนิคภายในขอบเขต **Phase 0a** ได้ตาม `AGENTS.md` ข้อ 11 (โดยต้องบันทึกแนวคิด เหตุผล และขอบเขตไว้ในไฟล์ของ Agent):

| # | รายการอนุมัติ | ผู้ตัดสินใจ | สถานะ |
|---:|---|---|:---:|
| 1 | Web App บน Chromium ไม่มี Backend ใน MVP | `anuwat` | ☑ |
| 2 | Core Contract + Rust/WASM เป็น Core หลัก (สลับ TypeScript ได้ที่ Decision Gate) | `anuwat` | ☑ |
| 3 | โฟลเดอร์ Zero-Copy (`game/assets/` ร่วมกัน) | `anuwat` | ☑ |
| 4 | Local Folder + Transactional Export + Manifest Hash | `anuwat` | ☑ |
| 5 | Data Model มาตรฐาน (Node 5 ชนิด, ตัวแปร 3 ชนิด, Condition AST) | `anuwat` | ☑ |
| 6 | เกณฑ์ Summer House และ Parity 100% (กลุ่ม A/A+) เป็นเกณฑ์ผ่าน Phase 0a | `anuwat` | ☑ |
| 7 | ใช้ ID ถาวร (UUID) และชื่อ Ren'Py แบบ `sf_<kind>_<shortId>` | `anuwat` | ☑ |
| 8 | ล็อกกฎตัวเลข (`i64 → clamp` หลังทุก effect) และกฎ Event/Subgraph เป็นสเปกกลาง | `anuwat` | ☑ |
| 9 | Export แบบ Transaction หลายไฟล์ด้วย pending journal | `anuwat` | ☑ |
| 10 | ย้าย Autosave/Recovery/Web Locks มา Phase 1 | `anuwat` | ☑ |
| 11 | แบ่ง Phase 0 เป็น 0a (~2 สัปดาห์) และ 0b (~1 สัปดาห์) | `anuwat` | ☑ |
| 12 | เป้าประสิทธิภาพเป็นค่าชั่วคราว ยืนยันหลัง baseline | `anuwat` | ☑ |
| 13 | ข้อความผู้เขียนเป็น literal โดยค่าเริ่มต้น (Escape อัตโนมัติ) | `anuwat` | ☑ |
| 14 | ไม่มีการสุ่มใน MVP | `anuwat` | ☑ |

---

## 2. กติกา ฟิลด์ พอร์ต และการนับวันของโหนด `schedule` (`0a.1.2`)

1. **ฟิลด์บังคับของโหนด `schedule`:**
   - `startDay`: จำนวนเต็มบวก (`int >= 1`, ค่าเริ่มต้น `1`)
   - `lastDay`: จำนวนเต็มบวก (`int >= startDay`, รวมวันสุดท้าย เช่น `startDay = 1, lastDay = 3` คือรันวัน `1, 2, 3`)
   - `activities`: รายการกิจกรรมตามลำดับที่ตั้งไว้ โดยต้องมีกิจกรรมสำรอง (`fallback` / ไม่มีเงื่อนไข) อย่างน้อย 1 รายการ
   - พอร์ตขาออก: `onComplete` (บังคับต้องเชื่อมไปยังโหนดถัดไป)
2. **กติกาการนับวันและทางออก `onComplete`:**
   - เมื่อเดินเข้าโหนด `schedule` ครั้งแรก ระบบกำหนดค่าตัวแปร `day = startDay` เสมอ
   - ในแต่ละวัน ระบบรันลำดับคงที่ตาม Concept §3.7:
     1. ตรวจ Event เฟส `before_activity` (เรียง `priority` สูง → ต่ำ แล้วตามลำดับ `order` ในรายการ เลือกเฉพาะ Event แรกที่ผ่านเงื่อนไข; หาก `once: true` ให้บันทึกว่าเกิดแล้วทันทีก่อนเข้า `subgraph`)
     2. เลือก `activity` ประจำวัน → คำนวณ `effects` ของ `activity` ทันที → หากมี `subgraph` ให้เรียกเข้า `subgraph` จนจบที่ `return` (หรือจบเกมหากเจอ `ending`)
     3. ตรวจ Event เฟส `after_activity` (กติกาเดียวกับข้อ 1)
     4. ตรวจ Event เฟส `end_of_day` (กติกาเดียวกับข้อ 1)
   - เมื่อจบเฟส `end_of_day` โดยไม่เกิด `ending`:
     - ถ้า `day < lastDay`: เพิ่มค่า `day = day + 1` แล้ววนเริ่มเฟส `before_activity` ของวันถัดไป
     - ถ้า `day == lastDay`: **ไม่เพิ่มค่า `day`** (ค่า `day` คงเท่ากับ `lastDay`) และเดินออกทางพอร์ต `onComplete` ทันที

---

## 3. รูปแบบ `StepTrace` บังคับ และวิธีเก็บ/เทียบกับ Ren'Py SDK (`0a.1.3`)

1. **รูปแบบไฟล์และฟิลด์บังคับของ `StepTrace`:**
   - เก็บเป็น JSON Lines (`.jsonl`) โดยแต่ละบรรทัดคือ 1 ก้าวการตัดสินใจ/เปลี่ยนสถานะ มีฟิลด์บังคับ 12 ฟิลด์ดังนี้:
     - `step` (`int` เริ่มจาก `1`)
     - `nodeId` (`string` รหัสโหนด กิจกรรม หรือ Event ปัจจุบัน)
     - `day` (`int` วันปัจจุบัน)
     - `phase` (`string`: `"scene" | "branch" | "effect" | "before_activity" | "activity" | "after_activity" | "end_of_day" | "schedule_complete" | "end"`)
     - `choiceId` (`string | null` รหัสตัวเลือกหรือกิจกรรมที่ถูกเลือกในก้าวนั้น)
     - `eventId` (`string | null` รหัส Event ที่ทำงานในก้าวนั้น)
     - `ending` (`string | null` รหัสฉากจบเมื่อถึงโหนด `end` ชนิด `ending`)
     - `varsBefore` (`object` ค่าตัวแปรทั้งหมดก่อนประมวลผลก้าวนั้น)
     - `varsAfter` (`object` ค่าตัวแปรทั้งหมดหลังประมวลผล effects และ clamp ในก้าวนั้น)
     - `visibleChoices` (`array<string>` รายการ **ID (`choiceId` หรือ `activityId`)** ที่ผ่านเงื่อนไขและแสดงให้เลือกได้ในก้าวนั้น เรียงตามลำดับการแสดงผล)
     - `conditionResults` (`object<string, boolean>` แผนที่จาก **ID (`choiceId`, `activityId`, หรือ `eventId`)** ไปยังผลการประเมินเงื่อนไข `true/false` ในก้าวนั้น)
     - `transition` (`string` เป้าหมายการเดินต่อ เช่น `nodeId` ถัดไป, `"return"`, หรือ `"ending:<id>"`)
   - **เหตุผลที่ใช้ ID ใน `visibleChoices` และ `conditionResults`:** เพื่อให้การเปรียบเทียบ Parity ระหว่าง `sf-core` กับ Ren'Py SDK ไม่ผูกติดกับการแก้ไขข้อความป้ายกำกับภาษาไทย/อังกฤษ
2. **วิธีเก็บจาก Ren'Py SDK และผู้รับผิดชอบ:**
   - `sf-cli` (พัฒนาใน `0a.5`) รับผิดชอบการรันชุดทดสอบเทียบ Parity โดยใช้กลไกที่พิสูจน์แล้วใน `0a.0` (`Character(..., interact=False)` + แทนที่ `store.menu` ในโหมดทดสอบเพื่อรับรายการตัวเลือกและป้อนอินพุตอัตโนมัติ)
   - โค้ดเก็บ Trace สำหรับทดสอบจะทำงานเฉพาะเมื่อรันผ่านโหมดทดสอบของ CLI เท่านั้น (ชุดส่งออกเกมปกติไม่มี instrumentation ติดไป)
   - ข้อมูลรุ่น SDK (`renpy.version()`) เก็บแยกไว้ในหลักฐานการรัน ไม่นำมาปะปนในฟิลด์ที่ใช้เทียบ Parity รายก้าว

---

## 4. รุ่น Ren'Py SDK ที่ตรึง สภาพแวดล้อม Parity และเครื่องวัด Baseline (`0a.1.4`)

1. **รุ่น Ren'Py SDK ที่ตรึงใน Phase 0a:**
   - รุ่น: **Ren'Py `8.3.7.25031702`** (จากชุดติดตั้งทางการ `renpy-8.3.7-sdk.zip`)
   - SHA-256 ของไฟล์ SDK ZIP: `7722E17AED8C174307C1E69D087D74EF009BC164A4DE4830149794F8DA3F7ECF`
2. **สภาพแวดล้อมสำหรับรันเทียบ Parity (`0a.6`) และวัด Baseline (`0a.7`) ใน Phase 0a:**
   - เจ้าของโครงการยืนยันให้ใช้ **เครื่อง Windows พัฒนานี้ (`Windows NT 10.0.26300.0`, 4 logical processors, Desktop Session พร้อม `-WindowStyle Hidden`)** คู่กับ Ren'Py SDK `8.3.7.25031702` เป็นสภาพแวดล้อมอ้างอิงทั้งสำหรับการตรวจรับ Parity (`0a.6`) และการวัดค่า Baseline (`0a.7`) ใน Phase 0a
   - ใช้ชุดตัวแปรสภาพแวดล้อมมาตรฐานจาก `0a.0`: `SDL_AUDIODRIVER=dummy`, `RENPY_DISABLE_JOYSTICK=1`, `RENPY_SKIP_MAIN_MENU=1`, `RENPY_SKIP_SPLASHSCREEN=1`, `RENPY_PERFORMANCE_TEST=0` (ไม่ตั้ง `SDL_VIDEODRIVER=dummy`)
   - สำหรับการวัด Baseline ใน `0a.7` จะใช้ Fixture กราฟสังเคราะห์ขนาด 2,000 โหนดที่สร้างด้วยวิธี Deterministic (เตรียมใน `0a.2`) พร้อมบันทึก hash ของไฟล์ Fixture, รุ่น Rust toolchain และ `Cargo.lock` ไว้ในหลักฐานตรวจรับ

