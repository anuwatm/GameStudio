# Phase 1.8 · แผน customize node · ภาพ เสียง วิดีโอ และการจัดฉาก

วันที่ 2026-11-14 · ข้อเสนอ Codex · ผู้ใช้ยืนยันเน้น presentation ของเกม

**สถานะ: เจ้าของอนุมัติเพิ่มเป็น Phase 1.8 แล้ว (2026-11-14)** ยังไม่เริ่มพัฒนาและยังไม่แก้ Core Contract; ตรวจรับส่วนเพิ่มด้วย Gate 1.8 แยกจาก Gate 1 เดิมที่รับ 1.1–1.7 แล้ว ไม่แทนรายการ Phase 2 เดิม

## แนวทางที่แนะนำ

เริ่มจาก **Scene node เดิม + Scene Composer ใน Inspector** ให้ผู้สร้างเลือกฉากหลัง วางตัวละคร ตั้งเสียง ใส่วิดีโอ และผูก cue กับบทพูดได้ในหน้าเดียว ใช้กราฟเดิมกำหนดเส้นทาง ไม่ต้องเพิ่ม node ย่อยหนึ่งตัวต่อทุกเสียงหรือการขยับภาพ

ตัวอย่างงานจริง: เปิดฉากคาเฟ่ → วางตัวละครด้านซ้าย → เริ่มเพลง → แสดงบทพูดพร้อมเสียงพากย์ → เลือกคำตอบ → ไปฉากถัดไป ผู้สร้างใช้ Preset ฉากเดิมต่อได้โดยไม่คัดลอก UUID หรือ reference ผิด

ความต้องการใหม่ที่ไม่อยู่ใน Phase 1: scene composition, cue timing, music/voice channels และ preview สื่อ ผู้ใช้เลือกขอบเขตนี้เพื่อวางแผน อนุมัติเพิ่มขอบเขตเป็น1.8แล้ว แต่ยังต้องยืนยัน schema/semantics ใน1.8.2 ก่อน implement ส่วนที่พึ่งพา

## ช่องว่างของระบบปัจจุบัน

| ตอนนี้มี | สิ่งที่ควรเพิ่ม |
|---|---|
| ลงทะเบียน asset และเลือก `assetIds` ของ Scene | Asset picker แยกบทบาท Background / Character / Music / SFX / Voice / Video |
| ภาพเปลี่ยนฉากตามลำดับรายการ | เลเยอร์ฉากหลังและตัวละครหลายตัว พร้อมตำแหน่งและขนาด |
| เสียงเล่นเป็น sound | แยก music loop, SFX และ voice ต่อบทพูด พร้อมหยุด/เปลี่ยนตาม lifecycle |
| WebM cutscene และ local preview | เลือก cutscene แบบรอจบ/ข้ามตามกติกาที่ตกลง แสดงข้อจำกัด codec |
| Playtest logic | แผง preview presentation ที่บอกชัดว่าประมาณการหรือผลจริงจาก SDK |

อ้างอิงพฤติกรรมจริงจาก `crates/sf-core/src/export.rs`: ภาพ `scene`, WebM cutscene, เสียง sound ทำตามลำดับ `assetIds` ก่อนบทพูด การแปลงของเก่าต้องรักษาลำดับนี้ ไม่เดาว่าภาพเก่าเป็น sprite หรือเสียงเก่าเป็นเพลง

## หน้าจอและ workflow

Scene Inspector มีส่วน **ฉาก**, **ตัวละคร**, **เสียง**, **วิดีโอ**, **บทพูดและ Cue**, **ตัวเลือก** ใช้ Progressive disclosure: ค่าพื้นฐานก่อน ตัวเลือกขั้นสูงเปิดเมื่อจำเป็น

- **Stage preview:** อัตราส่วนเดียวกับเกม เลือกวัตถุจาก canvas หรือรายการเลเยอร์ ใช้ตำแหน่งซ้าย/กลาง/ขวาและค่า X/Y/scale ที่กรอกด้วยคีย์บอร์ดได้ ไม่บังคับลากเมาส์
- **Layers:** เรียงหน้า–หลัง ซ่อน/แสดงใน preview และลบวัตถุที่เลือก ต้องแยก preview-only mute/hide ออกจากค่าที่จะ Export
- **Audio:** เลือกไฟล์/บทบาท/volume; Music มี loop และ stop; SFX มี trigger; Voice ผูกกับบทพูด ไม่เล่นอัตโนมัติก่อน user gesture
- **Video:** ระยะแรกใช้ cutscene ก่อนบทพูด รองรับ WebM ที่ตรวจแล้ว; video background ซ้อน UI และ branching กลางคลิปเป็นงานถัดไป
- **Apply / Undo / Redo:** draft preview ก่อน Apply; Apply เป็น Core Patch หนึ่งรายการ Undo ย้อนการจัดฉากทั้งชุดได้ ไม่ปล่อย state preview เปลี่ยน gameplay โดยไม่ตั้งใจ
- **Presets:** บันทึก layout และ asset references สำหรับนำไปใช้ Scene ใหม่; สร้าง UUID ใหม่ให้ entities ที่ต้องมี identity ส่วน asset/character references คงเดิม

## ข้อมูลและขอบเขตทางเทคนิคที่เสนอ

| ชั้น | หน้าที่ |
|---|---|
| Core scene presentation | asset references, layers, transforms, audio actions, video settings และ cue ที่ Export ต้องใช้; เป็นข้อมูล typed ไม่มี Python/JS อิสระ |
| Editor metadata | node display name/color/notes, ตำแหน่งกราฟ, viewport, panel state; ไม่เปลี่ยนผลเกม |
| Preview runtime | แปลข้อมูล presentation เพื่อดูตัวอย่างและใช้ logic trace จาก Core; ไม่เขียน Condition/Effects evaluator อีกชุด |
| Rust exporter | แปลง presentation ที่ validate แล้วให้ Ren'Py; source map ผูก node/cue/line เพื่อแจ้งจุดผิด |

เสนอวาง editor metadata ในไฟล์ sidecar มี `version`, `projectId` และ key เป็น node UUID; ตัวอย่างชื่อ `.storyflow/editor.json` ยังต้องล็อกก่อนพัฒนา ข้อมูลฉากที่มีผลเกมต้องอยู่ canonical Project ไม่เก็บเฉพาะ browser

ต้องตกลงก่อนเปลี่ยน schema: หน่วยพิกัด/anchor, viewport เกม, ลำดับเลเยอร์, การรับช่วงฉาก/เสียงจาก Scene ก่อนหน้า, เวลาเข้า Scene/ก่อนบทพูด/หลังบทพูด, การข้ามและ Rewind, error เมื่อไฟล์ขาด และการเปิดโปรเจกต์รุ่นใหม่ด้วยแอปรุ่นเก่า

ข้อเสนอเริ่มต้น: พิกัด normalized เทียบ stage, preset ซ้าย/กลาง/ขวา, cue ตามบทพูดก่อนใช้ timeline มิลลิวินาที; คง node kinds เดิม 5 ชนิด ระยะแรกไม่รองรับ plugin code หรือ custom script node

โปรเจกต์เก่าใช้ compatibility path เล่น `assetIds` แบบเดิมจนผู้ใช้เลือกแปลง Scene นั้นอย่างชัดเจน สำรองก่อน migration; version ใหม่ต้องทำ Contract/schema/migration/Worker/CLI/WASM/exporter พร้อมกันและทดสอบ parity ไม่เพิ่ม field ฝั่ง React อย่างเดียว

## ขั้นพัฒนาและ checklist Phase 1.8

| ระยะ | งานก่อนลงมือ | เกณฑ์ตรวจรับ |
|---|---|---|
| 1.8.1 Node UI | [ ] การ์ดและInspectorของnode5ชนิดตามmockup [ ] พอร์ต/keyboard/validation/draft [ ] regressionบนContractเดิม | ใช้งานข้อมูลเดิมได้จริง; ไม่แสดงpresentationที่ยังไม่มีเป็นผลจริง; ผ่านEditor regressionและresponsive |
| 1.8.2 ล็อกขอบเขต | [ ] ทำตัวอย่างฉากจริง 3 แบบ: บทสนทนา 2 ตัวละคร, ฉากมีเสียงพากย์, cutscene [ ] ตกลง semantics และ schema [ ] ยืนยัน mockup/fixture | เจ้าของรับ workflow, defaults, compatibility และรายการนอกขอบเขต |
| 1.8.3 Contract / migration | [ ] typed presentation + validator [ ] backup/migration [ ] stable cue/line IDs [ ] metadata persistence ที่ตกลง | เกมเก่าเปิด/Export/trace เดิม; field ผิดถูกปฏิเสธ; migration ล้มเหลวไม่ทับต้นฉบับ |
| 1.8.4 ภาพและ Stage | [ ] background + หลาย character layers [ ] position/scale/order [ ] keyboard controls [ ] Apply/Undo/Save/reopen | ฉาก 2 ตัวละครจัดได้โดยไม่เขียนโค้ด เปิดใหม่คงค่า; SDK แสดงถูกตาม fixture |
| 1.8.5 เสียงและ Voice | [ ] Music/SFX/Voice [ ] cue ต่อบทพูด [ ] stop/loop/volume [ ] preview cleanup | เปลี่ยน Scene แล้วไม่มีเสียงรั่ว/เล่นซ้อนที่ไม่ได้กำหนด; skip/replay ทำตามมติ; SDK ทดสอบเสียงจริง |
| 1.8.6 Video | [ ] WebM cutscene [ ] playback/skip policy [ ] ข้อผิดพลาด/permission [ ] cue ต่อฉาก | จบ/ข้าม/เสียหาย/ไม่มีสิทธิ์ไม่ทำให้ flow ค้าง; ไฟล์เดิมไม่ถูก copy ตอน Export |
| 1.8.7 Presets / preview / ตรวจรับ | [ ] Preset ฉาก [ ] preview จากข้อมูลเดียวกัน [ ] SDK fixtures [ ] regression เดิม [ ] ตัวชี้วัดเพิ่มและผู้ใช้จริง | Preset ไม่ทำให้ ID ชน; logic trace เดิม; P1–P8 เดิมไม่ถอย; ผู้สร้างทำตัวอย่างครบได้ |

ลำดับแนะนำ: 1.8.1 → 1.8.2 → 1.8.3 → 1.8.4 → 1.8.5 → 1.8.6 → 1.8.7 ตรวจรับและ cleanup แต่ละระยะตาม AGENTS.md ก่อนขึ้นระยะถัดไป

## ชุดตรวจรับสำหรับใช้งานจริง

- [ ] ภาพพื้นหลัง + 2 sprites + ภาษาไทย: ขนาด/anchor/layer order ตรงค่าที่บันทึกใน SDK
- [ ] เสียงพากย์หลายบท: line insert/delete/reorder ยังอ้าง cue ถูก; หยุด/ข้าม/ย้อนตาม policy ที่ยืนยัน
- [ ] เพลงข้าม Scene: explicit start/keep/stop ไม่พึ่ง state ค้างที่ไม่ได้ประกาศ
- [ ] สื่อหาย/ย้าย/ไฟล์ใหญ่/permission/quota: แจ้งจุดที่เกี่ยวข้องและเก็บ draft; ไม่แสดงว่าส่งออกสำเร็จผิดจริง
- [ ] Autosave/recovery หลายแท็บและ Export กลางคันยังคง protection เดิม
- [ ] Export deterministic; path validation; user files ไม่ถูกทับ; Source Map นำกลับไปยัง node/cue ได้
- [ ] รูป/เสียง/วิดีโอ preview ปิดแล้วคืน resource; ไม่ preload media ทุก node ในกราฟ 2,000 nodes
- [ ] UI preview ระบุข้อจำกัดของ renderer; ใช้ SDK ตัดสิน presentation สุดท้าย ไม่อ้างความเหมือนจาก screenshot ฝั่งเว็บอย่างเดียว

## การตัดสินใจที่ขอเมื่อเริ่มพัฒนา

เริ่มปรับ Node UI ใน1.8.1บนContractปัจจุบัน แล้วทำ1.8.2เพื่อล็อก workflow จากนั้นยืนยัน schema และ semantics ก่อน 1.8.3 ไม่เปลี่ยน Contract ในขั้นร่างแผน เสนอทำ 1.8.4–1.8.6 เป็นชุดใช้งานแรก; animation timeline, lip-sync, video background, shader และ node logic ใหม่แยกไว้พิจารณาภายหลัง ระยะเวลาประเมินหลัง 1.8.2 เพื่อลดการเดาจากจำนวนฟีเจอร์

---

## ข้อเสนอแนะและเกณฑ์กำกับจาก Gemini (2026-11-14) เพื่อให้ GPT/Codex ดำเนินการใน 1.8.1–1.8.7

1. **Voice Cue Stability (1.8.2, 1.8.5):**
   * บรรทัดบทพูด (`line`) ต้องมี `line.id` (UUID ถาวร) สำหรับผูกไฟล์เสียงพากย์ (`voiceId`)
   * ห้ามผูกด้วย array index เพราะเมื่อผู้เขียนเพิ่ม/ลบ/สลับบรรทัดใน Inspector จะทำให้เสียงพากย์เลื่อนผิดตำแหน่ง
2. **Audio Lifecycle ชัดเจน 3 สถานะ (1.8.2, 1.8.5):**
   * ใน Scene Inspector ต้องมีตัวเลือกสถานะ BGM ชัดเจน:
     - `keep` (เล่นเพลงเดิมต่อเนื่องข้ามฉาก - ค่าเริ่มต้น)
     - `play` (เปลี่ยนเพลงใหม่และวนลูป)
     - `stop` (หยุดเพลงเดิม)
   * เพื่อให้พฤติกรรมใน Ren'Py (`play music` vs ละเว้น vs `stop music`) เป็นไปอย่างแม่นยำ ไม่หยุดกะทันหันหรือรีสตาร์ตเพลงซ้ำทุกฉาก
3. **Lazy-loading & Media Lifecycle Cleanup (1.8.5, 1.8.7):**
   * บนโปรเจกต์ขนาดใหญ่ (เช่น baseline 2,000 โหนด) ห้ามสร้างหรือโหลด `<audio>` / `<video>` ล่วงหน้าทุกโหนด
   * ให้สร้าง single instance หรือโหลดเฉพาะฉากที่เปิดใน Inspector/Playtest และต้องเรียก `.pause()`, ล้าง `src` และ revoke Blob URL ทันทีเมื่อปิดหรือเปลี่ยนโหนด เพื่อป้องกันการชนเพดาน Browser AudioContext และ memory leak
4. **ความเข้ากันได้ย้อนหลัง 100% กับ Summer House (1.8.3):**
   * ฉากที่ไม่มีฟิลด์ `presentation` ใหม่ ต้องรันตาม `assetIds` เดิม 100% และระบบต้องไม่เดาแปลงภาพเดิมเป็น sprite เว้นแต่ผู้ใช้จะเปิดแก้ใน Scene Composer
5. **Source Map Granularity (1.8.7):**
   * Source map ต้องแมปกลับมาได้ถึงระดับ `lineId` และ `voiceCue` เมื่อ Ren'Py รายงานข้อผิดพลาดในฉากที่มีการจัดเลเยอร์ซับซ้อน

## เพิ่มขอบเขต Node UI ตามคำสั่งเจ้าของ · 2026-11-15

รวมใน1.8.1: ปรับการ์ดและInspectorของScene/Branch/Effect/Schedule/Endให้ใช้งานจริง อ้างอิง [ภาพและรายละเอียด Node UI](demo%20screen/Node-UI-1.8.md) และchecklistกลาง1.8.1/1.8.7

การ์ดแสดงข้อมูลสรุปที่ใช้ตัดสินใจ; รายละเอียดแก้ในInspector พอร์ตต้องตรงContractเดิม ไม่มีnodeชนิดใหม่ ตรวจkeyboard/focus/validation/Apply-Cancel/Undo-Redoและจอ1440/1000/700pxพร้อมperformance2,000nodes

ภาพเป็นข้อเสนอที่ต้องยืนยันองค์ประกอบก่อนimplement แก้จำนวนlayersเป็น3เมื่อมีBackground+2characters และใช้fallbackเฉพาะเมื่อไม่มีChoiceผ่านvisibleIf การเพิ่มชื่อnodeที่แก้ได้ต้องล็อกmodel/persistenceใน1.8.3ก่อน ไม่ใช่fieldที่มีอยู่แล้ว

## เปลี่ยนลำดับตามเจ้าของ · 2026-11-15
1.8.1=Node UI; 1.8.2=workflow/semantics; 1.8.3=Contract/migration; 1.8.4=Scene Composer; 1.8.5=Audio; 1.8.6=Video; 1.8.7=Presets/ตรวจรับรวม

NodeUIระยะแรกใช้ข้อมูลเดิมและไม่เปลี่ยนschema แสดงmedia controlsที่ใช้ข้อมูลใหม่เมื่อขั้นที่พึ่งพาพร้อมเท่านั้น ชื่อeditableและข้อมูลpresentationไม่ถูกเพิ่มเข้าContractก่อนยืนยันใน1.8.2 ส่วนข้อเสนอในgemini.mdใช้เลขเดิม ณ วันที่เขียน ให้เทียบmappingนี้เมื่อดำเนินงาน
