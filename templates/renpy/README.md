# StoryFlow new-game template

ใช้เมื่อ CLI สร้างโฟลเดอร์เกมใหม่เท่านั้น ไม่ใช้ทับ UI ของเกมเดิม

- Ren'Py 8.3.7: Unicode line breaking + HarfBuzz shaping
- Thai: Noto Sans Thai Looped UI (ส่วนอักษร U+0E00–U+0E7F)
- Latin/อักษรอื่น: DejaVuSans.ttf ที่มากับ Ren'Py SDK (ไม่คัดลอกฟอนต์ Windows)
- มีหน้าหลักและ say/choice screens ขั้นพื้นฐาน ไม่ใช่ภาพดีไซน์ Web Studio
- template ช่วยรองรับข้อความไทย ไม่ได้รับรองฟอนต์สำหรับทุกภาษา

Noto binary ที่ไม่แก้ไขดาวน์โหลด 2026-11-12 จาก:
https://notofonts.github.io/thai/fonts/NotoSansThaiLoopedUI/hinted/ttf/NotoSansThaiLoopedUI-Regular.ttf

ใบอนุญาต SIL Open Font License 1.1 พร้อม copyright อยู่ใน game/assets/fonts/OFL.txt
ที่มา: https://github.com/notofonts/thai/blob/main/OFL.txt

ดู hash และผลทดสอบจริงใน document/phase-0b/media-0b3.md

Thai wrapping: config.replace_text เติมจุดแบ่งเฉพาะชั้นแสดงผลด้วย TCC จาก PyThaiNLP v5.1.2 (ไม่แก้ source) ใช้ Unicode line breaking; ไม่ใช่ตัวตัดคำตามพจนานุกรม และไม่แก้ค่า string ใน Project/RunState
ที่มา: https://github.com/PyThaiNLP/pythainlp/blob/v5.1.2/pythainlp/tokenize/tcc.py
ใบอนุญาต Apache-2.0 อยู่ใน game/python-packages/PyThaiNLP-LICENSE.txt
Template init offset=-100 ให้หน้าจอของผู้ใช้ override ได้ตามปกติ


Phase1.6 Web Studio ใช้templateชุดนี้กับเกมใหม่ที่ไม่มีสคริปต์และไม่ชนชื่อไฟล์เท่านั้น ติดตั้งแยกก่อนgenerated export ไม่ทับไฟล์ของเกมเดิม script.rpyในtemplateเรียกsf_entry การติดตั้งที่ถูกปิดค้างต้องตรวจไฟล์ก่อนลองซ้ำ ไม่ใช่transactionrollbackชุดgenerated
