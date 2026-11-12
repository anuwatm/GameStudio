---
name: StoryFlow Web Studio
description: มาตรฐานกลาง UI จาก mockup สำหรับ Web Studio MVP
colors:
  background: "#131922"
  surface: "#202938"
  text: "#F2F5F7"
  text-secondary: "#B9C5D3"
  border: "#526174"
  accent: "#58D4B4"
spacing:
  small: "8px"
  medium: "12px"
  large: "16px"
  section: "24px"
---

# StoryFlow · Web Design Standard

## Overview

สถานะ: มาตรฐานจาก mockup สำหรับใช้พัฒนาและตรวจ UI ใน Phase 1 ไม่ใช่หลักฐานว่า UI พัฒนาเสร็จหรือเจ้าของโครงการตรวจรับภาพแล้ว

เป้าหมาย: สร้างเรื่อง → ตั้งกติกา → ทดลอง → แก้ปัญหา → ส่งออก ได้ง่าย รวดเร็ว และแก้ไขต่อได้ ใช้แนวทาง Operate: งานและข้อมูลเป็นจุดเด่น ภาพตกแต่งไม่แย่งพื้นที่ทำงาน

ลำดับอำนาจ: คำสั่งเจ้าของโครงการ → Concept/ข้อตัดสินใจที่อนุมัติและ Core Contract สำหรับพฤติกรรม → DESIGN.md นี้สำหรับภาพและองค์ประกอบ → mockup สำหรับองค์ประกอบโดยรวม ภาพไม่สามารถเปลี่ยนกติกา Core ได้

แหล่งอ้างอิง:

- [กติกาภาพเดิม](document/demo%20screen/DESIGN.md) — แหล่งสี ระยะ และพฤติกรรมพื้นฐาน
- [Workflow และภาพอ้างอิง](document/demo%20screen/Workflow-Screens.md)
- [Concept](StoryFlow-Game-Studio-Concept.md), [Core Contract](contract/README.md), [Checklist](checklist.md)
- อ่านข้อเสนอใน document/claud_recommend.md ร่วมด้วย โดยรายการที่ยังรอยืนยันไม่กลายเป็นข้อบังคับจากเอกสารนี้

| หน้าจอ | ภาพหลัก | งานพัฒนา |
|---|---|---|
| Project | 01-Project-v2.png | 1.2, 1.5 |
| Story Graph / Scene Inspector | 02-Story-Graph-v2.png | 1.2 |
| Rules & Schedule | 03-Rules-Schedule-v2.png | 1.3 |
| Playtest | 04-Playtest-v2.png | 1.4 |
| Validate | 05-Validate.png | 1.4, 1.6 |
| Export | 06-Export-v2.png | 1.6 |

ภาพทั้งหมดอยู่ใน document/demo screen/ ใช้ v2 เมื่อมี ส่วนภาพ StoryFlow-Workflow.png และ StoryFlow-Story-Graph.png ใช้อธิบายภาพรวมเท่านั้น ค่าตัวอย่าง จำนวนรายการ Trace และพาธในภาพไม่ใช่ข้อมูลจริงหรือเกณฑ์ตรวจรับ

## Colors

ใช้ token ใน frontmatter เป็นแหล่งค่ากลาง และนำไปประกาศ CSS custom properties ร่วมกัน ห้ามแต่ละหน้ากำหนดสีหลักซ้ำเอง

- background: พื้นแอปและพื้นที่ว่างของกราฟ
- surface: แผง Inspector, ฟอร์ม, ตาราง และการ์ด
- text / text-secondary: เนื้อหาหลัก / คำอธิบาย ไม่ใช้ข้อความรองจนจางอ่านไม่ได้
- border: ขอบควบคุมและเส้นแบ่ง หลีกเลี่ยงเส้นซ้อนหลายชั้น
- accent: ปุ่มหลัก รายการเลือก พอร์ต/โหนดที่เลือก และ focus ring ปุ่มพื้น accent ใช้ข้อความสี background
- Success, Warning, Error ต้องมีไอคอนและข้อความร่วมกับสี ไม่ใช้ accent แทนทุกสถานะ
- สี Error/Warning/Info และสีประเภทโหนดยังไม่มีค่า hex กลางที่ยืนยัน ห้ามสุ่มแยกตามหน้า ให้เสนอ semantic tokens ชุดเดียวตอนทำ component library
- พื้นทึบ ขอบบาง ไม่เลียนแบบ glow/gradient ที่เกิดจากภาพเรนเดอร์

## Typography

- ใช้ UI font ที่รองรับไทยและอังกฤษตามกติกาเดิม เช่น Noto Sans Thai พร้อม system-ui fallback ต้องตรวจสระและวรรณยุกต์จริงก่อนล็อกฟอนต์
- ใช้ monospace กับพาธ รหัส Validator และ Trace เชิงเทคนิค ไม่ใช้กับบทพูดยาวหรือคำอธิบายไทย
- ลำดับชั้นคงที่: ชื่อหน้า → ชื่อส่วน → label → เนื้อหา → helper text ชิดซ้ายเป็นหลัก
- label ต้องแสดงตลอด ไม่ใช้ placeholder แทน label และไม่บังคับ uppercase กับภาษาไทย
- ค่าตัวเลขในตารางจัดแนวอ่านเทียบกันได้ ชื่อฉากยาวตัดพร้อมช่องทางดูเต็ม ห้ามตัดค่าที่กำลังแก้
- เจ้าของยืนยัน 2026-11-12: ภาษา UI ใช้ไทยเป็นหลัก คงศัพท์เทคนิคอังกฤษ เช่น Story Graph, Inspector, Undo/Redo, Validate และ Export รักษาชื่อ field/enum/error message และเนื้อหาเกมตามต้นฉบับ ไม่แปลข้อมูลโปรเจกต์เอง
- ยังไม่ล็อกขนาดตัวอักษรจากภาพ raster ให้กำหนด typography scale กลางพร้อมตัวอย่างไทยก่อนใช้ทุกหน้า

## Layout

**โครงร่วมทุกหน้า:** Top bar + Left navigation + Main workspace; Inspector ด้านขวาเมื่อมีรายการเลือก

- Top bar แสดงชื่อผลิตภัณฑ์/โปรเจกต์ สถานะบันทึก Undo/Redo และทางเข้า Playtest ตำแหน่งคงที่ เปลี่ยนเฉพาะสถานะจริง
- เมนูซ้ายเรียง Project → Story Graph → Rules & Schedule → Playtest → Validate → Export มี active state เดียวพร้อมชื่อและไอคอน
- Rules & Schedule ใช้แท็บ Variables / Daily Schedule / Events ตามภาพ ไม่เพิ่มเมนูซ้ายซ้ำสำหรับ Variables
- ใช้ spacing scale 8/12/16/24 px จากกติกาเดิม จัดแนวชื่อส่วน ช่องกรอก และปุ่มให้เป็นระบบเดียวกัน
- แยก scroll ของพื้นที่เนื้อหากับ Inspector ให้เข้าถึงปุ่มท้ายฟอร์มได้ ห้าม fixed height จนข้อมูลหาย
- บนจอแคบ แสดง Inspector แยกจากกราฟพร้อมทางกลับที่ชัดเจน เก็บ selection และค่าที่ยังแก้ไว้ ไม่บีบสามคอลัมน์จนใช้งานไม่ได้
- MVP เป็น Chromium desktop; responsive ไม่ได้แปลว่ารับรอง File System Access API บนมือถือหรือเบราว์เซอร์อื่น
- ความกว้าง sidebar/Inspector, breakpoint และขนาด top bar ยังไม่ล็อกจาก mockup ให้ทดสอบกับข้อความไทยและพื้นที่กราฟก่อนตกลง ห้ามอ้างว่าเป็นค่าที่อนุมัติแล้ว

## Elevation & Depth

ใช้ความต่าง background/surface และขอบบางแยกชั้น แสดง selected/hover/focus ต่างกันชัดเจน ไม่ใช้เงาหนัก แสงเรือง หรือภาพพื้นหลังทั่วแอป ภาพบ้าน/ตัวละครอยู่ใน Project preview หรือ Scene/Playtest preview เท่านั้น

Dialog และเมนูต้องอยู่เหนือแผงที่เปิดมัน ไม่ถูกกราฟบัง คืน focus ไปยังตัวเปิดเมื่อปิด การเคลื่อนไหวต้องช่วยบอกสถานะ ไม่ขยับ canvas หรือทำให้ selection กระโดดเอง และรองรับ reduced motion

## Shapes

รักษารูปแบบแผงสี่เหลี่ยมมุมมนตามภาพ โดยกำหนด radius token ร่วมใน component library ก่อนนำใช้ ห้ามแต่ละหน้าตั้ง radius เอง

ใช้ไอคอนเส้นชุดเดียว ความหนาและขนาดสัมพันธ์กัน ปุ่มไอคอนล้วนต้องมี accessible name และ tooltip โลโก้ต่างกันระหว่างภาพยังไม่ใช่ brand asset ที่อนุมัติ ห้ามเลือกตราใหม่จากภาพใดภาพหนึ่งเอง

## Components

### องค์ประกอบกลาง

| องค์ประกอบ | ข้อกำหนด |
|---|---|
| Primary button | ใช้ accent สำหรับงานหลักในบริบทนั้น ป้ายกริยาชัด มี disabled/busy state ป้องกันกดซ้ำ |
| Secondary / icon button | พื้นแผง ขอบบาง ไม่เด่นเท่างานหลัก มี hover/focus/disabled ที่แยกได้ |
| Input / Select / Textarea | มี label, helper และ error ใกล้ช่อง เก็บค่าที่พิมพ์เมื่อ validation ไม่ผ่าน แสดงข้อจำกัดจาก Contract |
| Tabs / Navigation | บอก active ด้วยรูปร่างหรือเส้นและข้อความร่วมกับสี ใช้ keyboard ได้ |
| Table / List | แถวเลือกตรงกับ Inspector ชื่อและการกระทำไม่ชนกัน มี empty/loading/error state |
| Status / Banner | ข้อความบอกสิ่งที่เกิด ผลกระทบ และวิธีแก้ ไม่ใช้สีล้วน ไม่แสดง Saved ก่อนบันทึกสำเร็จ |
| Dialog | ใช้เมื่อมีการตัดสินใจที่จำเป็น ระบุสิ่งที่จะเปลี่ยน ปุ่มยืนยันเป็นกริยา รักษา focus และคืน focus เมื่อปิด |
| Preview | รักษาสัดส่วนสื่อ มี loading/missing/error state ไม่ยืดภาพผิดสัดส่วน มีตัวควบคุมเสียง/วิดีโอที่จำเป็น |

ทุก control ใช้ semantic HTML, keyboard focus ที่มองเห็นได้ และลำดับ Tab ตามงาน ห้ามใช้ drag เป็นวิธีเดียวในการเชื่อม/จัดการกราฟ ต้องมีทางทำผ่าน Inspector หรือ control ที่เข้าถึงได้ เกณฑ์ contrast และขนาด hit area เชิงตัวเลขต้องระบุใน checklist UI ก่อนตรวจรับ ไม่ถือว่าตรวจผ่านจากภาพ mockup

### Project

แสดงการเลือก/เชื่อมต่อโฟลเดอร์ ตรวจ project.storyflow.json และ game/assets/ พร้อมเหตุผลเมื่อเปิดไม่ได้ การ์ดโปรเจกต์และรายการล่าสุดต้องใช้ข้อมูลจริง; เบราว์เซอร์ไม่ได้เปิดเผย absolute path เสมอ ให้แสดงชื่อโฟลเดอร์และพาธสัมพัทธ์ที่มีจริง

Recovery banner แสดงเมื่อพบ snapshot จริง ระบุว่าการ Restore จะนำร่างใดกลับมา แยกการ reconnect สิทธิ์โฟลเดอร์ออกจากการ restore ห้ามเขียนทับโดยไม่แสดงผลกระทบ

### Story Graph / Scene Inspector

- Canvas กลาง พื้นจุดบาง มีเลือก/เลื่อน/ซูม/พอดีกราฟ ตัวเลือก Main Story/Subgraph และ Add node
- โหนดแสดงชื่อ ประเภท พอร์ต และ selection; เส้นมีทิศทางและ label ของ choice/fallback/onComplete ที่ตรงข้อมูลจริง
- Inspector เปลี่ยนตาม node ที่เลือก แยก Media, Dialogue, Scene Effects และ Choices ใช้ฟอร์มแก้ condition/effect ร่วมกับ Rules
- พอร์ต fallback เป็นส่วนแยกจาก Choices และบอกว่าใช้เมื่อไม่มี choice แสดงได้
- ภาพวาด Return เป็น END เป็นความคลาดเคลื่อน: ประเภทจริงต้องอ้าง Schema/Contract และพฤติกรรม return ของ Subgraph ห้ามสร้างชนิด END ใหม่จากข้อความในภาพ
- ไม่สร้างชนิด node เพิ่มจากภาพกิจกรรมหรือ Event ใช้ชนิดที่ Contract รองรับเท่านั้น

### Rules & Schedule

- Variables: ต้องมีที่แก้ข้อมูลตาม Schema แม้ยังไม่มี mockup ฟอร์มแยก การจัดวางละเอียดรอทำใน 1.3
- Daily Schedule: แสดงกิจกรรม เงื่อนไข Effects และ Subgraph โดย Rest เป็นกิจกรรมไม่มีเงื่อนไขตาม Concept
- ภาพ Max Days เป็นคำตัวอย่าง ฟอร์มจริงต้องรักษาความหมาย startDay/lastDay แบบ inclusive ตามข้อตัดสินใจ 0a.1
- Events: Inspector แสดง trigger, once, target Subgraph, condition, priority และ order โดยใช้ enum และชนิดข้อมูลจาก Contract ไม่ใช้ข้อความตัวอย่างสร้าง enum ใหม่
- Condition Builder แสดงลำดับ AND/OR และการซ้อนกลุ่มชัดเจน Effect Editor บอกตัวแปร operation และค่า ไม่ให้ UI ประเมินกติกาแทน Core

### Playtest

แยก Preview, RunState ที่แก้ทดลองได้, ExplainCondition และ Trace แสดงค่าจริงกับค่าที่ต้องการ เช่น Affection 19 เทียบเกณฑ์ 20

SetVar/Restart/Rewind ใช้คำสั่ง Core ไม่แก้ค่าเริ่มต้นใน Project แสดงให้ชัดว่าเป็นการทดลอง ข้อความ Mock State ในภาพต้องไม่ทำให้ผู้ใช้เข้าใจว่ากำลังเปลี่ยนข้อมูลเกมถาวร Trace แสดงข้อมูลจาก StepTrace จริง พร้อมทางไปฉากที่เกี่ยวข้อง ไม่คัดลอก Trace สมมติจากภาพ

### Validate

แสดงจำนวน Error/Warning เวลาและ revision ที่ตรวจ แต่ละรายการมี rule code, ข้อความ, ตำแหน่งต้นเหตุ และทาง Jump to Node/field ที่ถูกต้อง แยก Error/Warning ด้วยข้อความและไอคอน

ปุ่มแก้ไขในภาพเป็นคำแนะนำ ไม่ใช่สิทธิ์ให้ auto-fix โดยเดาเป้าหมาย หากแก้โปรเจกต์หลังตรวจ ให้ระบุผลล้าสมัยและตรวจข้อมูลล่าสุดก่อน Export; Error บล็อก Export ตาม Core ส่วน Warning แสดงให้รับรู้ตามกติกาที่ตกลง

### Export

แสดงปลายทาง game/storyflow_generated/, ไฟล์ที่จะเขียน, สถานะ manifest/hash, Source Map และการใช้สื่อเดิมใน game/assets/ จากผลจริง ไม่ให้เปลี่ยนไปเขียนพาธนอกขอบเขตโดยอาศัยช่องเลือกในภาพ

- แยก ready / checking / writing / committed / failed / recovery required ให้ตรงผล storage
- ห้ามแสดงสำเร็จก่อน commit manifest; เมื่อ hash conflict ให้หยุดพร้อมไฟล์ที่ขัดแย้ง ไม่เพิ่มปุ่ม force overwrite โดยไม่มีนโยบายอนุมัติ
- แสดง Save warning เมื่อ Subgraph เปลี่ยนตามผล Core ไม่แสดงตลอดจากภาพตัวอย่าง
- Source Map ต้องย้อนกลับ nodeId/choiceId ได้ ไม่ใช่ badge สำเร็จจำลอง
- หลังสำเร็จแนะนำให้เปิดใน Ren’Py SDK ต่อ ห้ามอ้างว่าเว็บเรียกโปรแกรม SDK หรือ build/package ให้แล้ว
- การเชื่อม entry label กับเกมเดิมอธิบายตาม Concept ไม่แก้สคริปต์ผู้ใช้เองจากการออกแบบ UI

### สถานะที่ต้องออกแบบทุกหน้า

มีข้อมูล / ว่าง / กำลังโหลด / ล้มเหลว / ไม่มีสิทธิ์ / รายการเลือกไม่มีแล้ว / มีการแก้ยังไม่บันทึก ตามที่เกี่ยวข้อง บอกขั้นตอนกู้คืนที่ทำได้จริง ข้อผิดพลาดถาวรอยู่ใกล้จุดที่ต้องแก้ ไม่ใช้ toast ที่หายไปเป็นหลักฐานเดียว

## Do's and Don'ts

**ทำ**

- อ่านเอกสารนี้ก่อนพัฒนา UI ใช้ component และ tokens กลางก่อนเพิ่มของใหม่
- ทดสอบข้อความไทย ชื่อยาว พาธยาว ค่าว่าง และสื่อหาย ให้ข้อมูลและปุ่มยังเข้าถึงได้
- บันทึกภาพหน้าจอจริงพร้อม viewport และสถานะที่ทดสอบ แล้วเทียบกับภาพอ้างอิงตามหน้าที่ของหน้า
- แยกผลตรวจดีไซน์ออกจากผลทดสอบ Core และผลตรวจรับ Phase

**ห้าม**

- เปลี่ยนข้อมูลกติกาเพื่อให้ตรง mockup หรือแสดงข้อมูลตัวอย่างเสมือนเป็นผลจริง
- เพิ่ม Cloud, ZIP/Sandbox, backend หรือ mobile editor เพราะภาพหรือดีไซน์ดูเหมือนต้องมี
- ปิด error ด้วยสีอย่างเดียว ซ่อนคำอธิบายปุ่ม disabled หรือทำงานสำคัญผ่าน hover เท่านั้น
- เปลี่ยนสีหลัก โลโก้ หรือเมนูรายหน้าจนมาตรฐานแยกกัน

### Checklist ตรวจ UI ก่อนส่งตรวจรับ

- [ ] อ่าน Concept/Contract และภาพอ้างอิงของหน้าที่ทำครบ
- [ ] ใช้สี ระยะ shell และ shared components ตามเอกสาร
- [ ] ชื่อหน้า เมนู active, selection และ Inspector ตรงข้อมูลเดียวกัน
- [ ] ทุก action ทำงานจริงหรือแสดง disabled พร้อมเหตุผล
- [ ] มี empty/loading/error/permission และ recovery state ตามงาน
- [ ] Keyboard, focus, dialog, label และการใช้สีผ่านเกณฑ์ที่ระบุใน checklist รอบงาน
- [ ] ข้อความไทย/ชื่อยาวและ viewport ที่ตกลงไม่มีข้อมูลหายหรือปุ่มซ้อน
- [ ] กราฟ/Playtest/Validate/Export แสดงผลจาก Core และ storage จริง
- [ ] แนบ screenshot และผลทดสอบในไฟล์ agent แยกพัฒนาเสร็จจากตรวจรับผ่าน

### จุดที่ยังรอยืนยันก่อนล็อก component library

ภาษา UI ยืนยันแล้ว: ไทยเป็นหลัก คงศัพท์เทคนิคอังกฤษ ส่วน brand/logo asset, font ที่ใช้จริงพร้อมสิทธิ์, typography/radius/ขนาด control, ความกว้างแผงและ breakpoint, semantic/node colors และเกณฑ์ accessibility เชิงตัวเลข ยังไม่มีข้อยุติจาก mockup ให้เสนอชุดเดียวใน checklist งาน UI และยืนยันก่อนใช้เป็นมาตรฐานเพิ่ม ไม่ตีความว่ารายการเหล่านี้ขัดขวางการใช้กติกาที่มีหลักฐานแล้วข้างต้น
