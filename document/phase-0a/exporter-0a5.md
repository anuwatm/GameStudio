# 0a.5 · Ren’Py Exporter และ CLI

ผลบน Windows Desktop Session ด้วย Ren’Py `8.3.7.25031702` วันที่ 2026-11-11

```powershell
$sdk = 'temp/trace-spike/renpy-8.3.7-sdk'
$project = 'contract/fixtures/summer-house.json'
$cases = 'contract/fixtures/summer-house-cases.json'
cargo run -p sf-cli --locked -- validate $project
cargo run -p sf-cli --locked -- export $project temp/export-a
cargo run -p sf-cli --locked -- export $project temp/export-b
cargo run -p sf-cli --locked -- lint $sdk temp/export-a
cargo run -p sf-cli --locked -- smoke $project $cases A1 $sdk temp/export-smoke
```

ใช้ชื่อโฟลเดอร์ปลายทางใหม่ทุกครั้ง CLI เขียนสคริปต์และอ้างอิงสื่อใต้ `game/assets/` สำหรับโปรเจกต์ที่มีสื่อ ให้จัดสื่อไว้ตามพาธก่อนเปิดใน SDK การเขียนลงโปรเจกต์เดิมและ manifest แบบ Transaction อยู่ใน 0b

- `validate` คืน `[]` ส่งออกซ้ำได้ SHA-256 ตรงกันทั้ง 5 ไฟล์ `.rpy`
- Lint สำเร็จและมีคำแนะนำทั่วไปเรื่อง `config.check_conflicting_properties` รายงาน 2 บล็อกบทพูด และ 2 เมนู
- Smoke อ่าน choice/activity IDs จากเคส A1 แล้วแปลงเป็นป้ายเมนูเพื่อขับเกม fixture ผลคือ `{"day":3,"ending":"00000000-0000-4000-8000-000000000009","sdk":"Ren'Py 8.3.7.25031702"}`
- เทสต์ Rust ผ่าน 12 รายการ ตรวจความคงที่ของไฟล์, `label start` เดียว, การ Escape ในสคริปต์ และการแยก test hook ออกจากชุดส่งออกปกติ

Smoke รองรับเคสจาก entry ปกติที่ไม่มี patch หรือค่า override และต้องแยกตัวเลือกได้ด้วยข้อความที่ไม่ซ้ำ การเทียบ StepTrace รายก้าวและเคส A/A+ ที่เหลืออยู่ใน 0a.6 การตรวจข้อความไทยและสื่อจริงอยู่ใน 0b
