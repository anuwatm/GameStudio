# Node UI · Phase 1.8

วันที่ 2026-11-15 · Design proposal ยังไม่ใช่ UI ที่พัฒนาแล้ว

## หลักการ
การ์ดกราฟแสดงสรุปที่ช่วยตัดสินใจและพอร์ตจริง; Inspector จัดค่าละเอียด ใช้สี/ตัวอักษร/ระยะจาก DESIGN.md ไม่เพิ่ม node kind หรือเปลี่ยน Contract จากภาพ

| Node | ข้อมูลบนการ์ด | พอร์ตออก |
|---|---|---|
| Scene | ภาพย่อ, บทพูดสรุป, จำนวน layers/Voice, สถานะ Music, Choice | ไม่มี Choice ใช้ next; มี Choice ใช้พอร์ตแต่ละ Choice และ fallback |
| Branch | Condition สรุปพร้อม AND/OR; เปิดแก้ AST ใน Inspector | true / false |
| Effect | Effects เรียงลำดับ, operator/value, เตือนเรื่อง clamp | next |
| Schedule | วันเริ่ม–วันสุดท้าย inclusive, สรุป Activities/Events | onComplete |
| End | mode ending/return/jump, ปลายทางเมื่อ jump | ไม่มีพอร์ตออก; jump ใช้ targetGraphId |

## Scene Composer
Stage preview + Layers + transform controls ที่กรอกด้วยคีย์บอร์ดได้; แยกฉาก/เสียง/บทพูด ใช้ Music keep/play/stop และ Voice asset reference ต่อ line UUID ไม่ใช้ array index

เปิด/preview ไม่แก้ canonical Project; ใช้ Apply เพื่อยืนยันและ Undo เป็นชุด ข้อมูลสื่อ/การจัดฉากที่มีผลต่อเกมอยู่ Project; view state อยู่ editor metadata ตามมติที่จะล็อกใน1.8.1

ภาพตัวอย่างใช้ Scene แบบมี Choice 2 รายการ จึงมี output 3 จุดรวม fallback; ไม่แสดง next พร้อม Choice ข้อมูลชื่อฉาก/ตัวละคร/ไฟล์ในภาพเป็นตัวอย่าง

บนจอแคบ Inspector แยกหน้าแต่เก็บ selection/draft ไว้ สื่อโหลดเฉพาะ node ที่ใช้งาน ไม่สร้าง media runtime ในทุกการ์ด

## เกณฑ์พิจารณาภาพ
- [ ] เห็นชนิด node และสิ่งที่ต้องทำต่อได้โดยไม่เปิดฟอร์มทั้งหมด
- [ ] พอร์ตถูกต้องตาม Core Contract; End ไม่สร้าง outgoing edge
- [ ] ภาษาไทยอ่านง่าย ใช้ UUID เป็นข้อมูลรอง
- [ ] Stage ไม่เบียดฟอร์มและ Apply เข้าถึงได้
- [ ] แยก draft/preview/ข้อมูลบันทึกจริงชัดเจน

เครื่องมือภาพ: built-in image_gen (ui-mockup). Prompt direction: realistic desktop design sheet of five node cards plus Scene Inspector, existing dark slate/mint palette, Thai labels, correct ports, media/layers/audio/video controls and draft/Apply state. ภาพเป็นการสำรวจหน้าตา ไม่ได้ยืนยันค่าพฤติกรรมหรือ schema แทนเจ้าของ

ภาพ: Node-UI-1.8-v1.png (built-in image_gen) ตรวจภาพแล้วมี2จุดต้องปรับก่อนimplementation: ตัวอย่างStageมีBackground+2characters=3layers แม้ภาพแสดง2layers; fallbackหมายถึงไม่มีChoiceใดผ่านvisibleIf ไม่ใช่ผู้ใช้ไม่เลือก ภาพไม่ใช่แหล่งนิยามContract

