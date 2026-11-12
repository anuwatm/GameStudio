# StoryFlow Stack Diagram

อัปเดต 2026-11-12 ภาพสรุป Tech Stack ใช้คู่กับรายละเอียดและสถานะใน README ไม่แทน checklist ตรวจรับ

- storyflow-stack.html: HTML self-contained มีโลโก้และฟอนต์ฝังภายใน เปิดออฟไลน์ได้
- storyflow-stack.png / storyflow-stack-dark.png: PNG 2300×1840 จาก HTML เดียวกันผ่าน Chromium/Edge headless
- storyflow-stack.source.html: source ก่อน inline assets
- scripts/build-stack-diagram.py: ข้อมูลกลุ่ม nodes และเส้นเชื่อม พร้อมนำ CSS จาก skill template มาสร้าง source
- icons/: assets ที่ใช้จริงและ manifest ระบุแหล่ง

ใช้ skill stack-diagram: https://github.com/caru-ini/stack-diagram
โลโก้: svgl, gilbarbara/logos, devicon; pictograms: Lucide ไม่ใช้ pictogram แทนเครื่องหมายแบรนด์ที่ดัดแปลง Graph Editor เป็น pictogram ของแนวคิด โดยระบุ React Flow ใน role

ฟอนต์ Geist / JetBrains Mono ฝังใน HTML พร้อมใบอนุญาต OFL อยู่ข้างไฟล์ โลโก้ยังเป็นเครื่องหมายของเจ้าของแต่ละราย

## สร้างใหม่

กำหนด SKILL_DIR เป็นโฟลเดอร์ skill stack-diagram ที่ติดตั้ง:

```powershell
python scripts/build-stack-diagram.py $SKILL_DIR
python "$SKILL_DIR/scripts/build.py" document/diagrams/storyflow-stack.source.html document/diagrams/icons document/diagrams/storyflow-stack.html --fonts "$SKILL_DIR/assets/fonts"
python "$SKILL_DIR/scripts/render_png.py" document/diagrams/storyflow-stack.html document/diagrams/storyflow-stack.png --scale 2
```

Renderer ต้องมี Playwright/Chromium รอบนี้ติดตั้ง Python packages เฉพาะ temp/stack-python และใช้ executable_path ของ Edge ที่มีอยู่แทนดาวน์โหลด Chromium ไม่ได้เปลี่ยน dependency ของแอป

พบ SVG repaint issue ใน Edge เมื่อสลับธีมขณะหน้าเดิมเปิดอยู่ ทำให้ไอคอนใน PNG Dark หาย วิธีที่ใช้ตรวจรับ: สร้างสำเนา HTML ชั่วคราวโดยใส่ data-theme="dark" ที่ html แล้ว render แบบ --single ในหน้าใหม่ ไม่เปลี่ยนโลโก้หรือสีโลโก้ ถ้าใช้ Edge แทน bundled Chromium ให้กำหนด executable_path ในสำเนา renderer ที่อยู่ใต้ temp ไม่แก้ skill ต้นฉบับ

ตรวจภาพทั้ง Light/Dark แล้ว: โลโก้ครบ เส้นไม่ทับหัวกลุ่มหรือชื่อ node แผน Phase 1 มีป้าย planned, Node.js เป็น tooling และไม่มี Backend ที่เพิ่มจาก scope
