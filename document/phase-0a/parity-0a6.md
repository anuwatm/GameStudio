# 0a.6 · Core และ Ren’Py StepTrace Parity

รันวันที่ 2026-11-11 บน Windows Desktop Session ตามข้อตัดสินใจ 0a.1 โดยใช้ Ren’Py 8.3.7.25031702 และ Rust toolchain เดิม

## รันซ้ำ

หลัง build sf-cli ให้ใช้ปลายทางใหม่

```powershell
cargo run -p sf-cli --locked -- parity contract/fixtures/summer-house.json contract/fixtures/summer-house-cases.json temp/trace-spike/renpy-8.3.7-sdk temp/parity-new-run
```

CLI ใช้ projectPatch และค่า override เดียวกันใน Core กับเกม Ren’Py ที่สร้างจริง Hook ในชุดทดสอบจับค่าจากตัวแปรของ SDK และป้อนตัวเลือกด้วย ID ตามลำดับที่แสดง กลไกนี้วัดผล effects ที่สคริปต์จริงทำงาน ตัวเก็บ Trace ประเมินเงื่อนไขเพื่อบันทึกผลและใช้ SDK menu ตรวจจำนวนตัวเลือกที่แสดง การสร้าง StepTrace ของ Core และ SDK ทำแยกกันก่อนนำมาเทียบ

เปรียบเทียบทั้ง 12 ฟิลด์ทุกแถวตามลำดับ บันทึก core-trace.json, sdk-trace.json และอินพุตต่อเคส หากต่างให้หยุดพร้อม diff.json ที่ก้าวแรกที่ต่าง ถ้าตรงให้ตรวจ assertions ของ fixture เพิ่ม แล้วเขียน report.json เมื่อผ่านครบ

## ผลจริง

| เคส | จำนวนก้าว | ผล |
|---|---:|---|
| A1 | 16 | ผ่าน |
| A2-2-20 | 6 | ผ่าน |
| A2-3-19 | 6 | ผ่าน |
| A2-3-20 | 5 | ผ่าน |
| A3 | 12 | ผ่าน |
| A4 | 6 | ผ่าน |
| A5 | 6 | ผ่าน |
| A6 | 8 | ผ่าน |
| Aplus-low | 7 | ผ่าน |
| Aplus-high | 7 | ผ่าน |

รวม 79 ก้าวจาก 10 เคสย่อย Trace ตรงกันทุกฟิลด์และทุก assertion ผ่าน ดู [รายงาน](parity-evidence/report.json) และคู่ Trace ในโฟลเดอร์ parity-evidence ตัวสร้างเกมปกติใช้โหมดเดิม ส่วน instrumentation อยู่ใน sf-cli เฉพาะโหมด parity

Regression ของ Rust ผ่าน 12 เทสต์ การรันครั้งนี้ใช้ fixture เนื้อเรื่องที่ไม่มีไฟล์สื่อ การตรวจภาพ เสียง วิดีโอ และฟอนต์จริงอยู่ใน 0b
