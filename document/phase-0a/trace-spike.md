# 0a.0 · Ren’Py Trace spike

รันบน Windows ด้วย [Ren’Py SDK 8.3.7](https://www.renpy.org/release/8.3.7) รุ่นที่เกมรายงานคือ `8.3.7.25031702` SHA-256 ที่คำนวณจากไฟล์ SDK ZIP คือ `7722E17AED8C174307C1E69D087D74EF009BC164A4DE4830149794F8DA3F7ECF`

## รันซ้ำจากรากโปรเจกต์

```powershell
$sdk = (Resolve-Path 'temp/trace-spike/renpy-8.3.7-sdk').Path
$probe = (Resolve-Path 'document/phase-0a/trace-probe').Path
$env:SDL_AUDIODRIVER = 'dummy'
$env:RENPY_DISABLE_JOYSTICK = '1'
$env:RENPY_SKIP_MAIN_MENU = '1'
$env:RENPY_SKIP_SPLASHSCREEN = '1'
$env:RENPY_PERFORMANCE_TEST = '0'
$run = Start-Process "$sdk/renpy.exe" -ArgumentList ('"' + $probe + '"') -WindowStyle Hidden -PassThru
if (!$run.WaitForExit(20000)) {
    Stop-Process -Id $run.Id
    throw 'Trace probe timeout'
}
if ($run.ExitCode -ne 0) { throw "Trace probe failed: $($run.ExitCode)" }
Get-Content "$probe/trace.jsonl"
```

[สคริปต์เกมทดสอบ](trace-probe/game/script.rpy) รันบทพูดแบบไม่หยุดรอ และเลือก Help Mina ผ่าน menu hook เฉพาะ fixture หลัง SDK กรองตัวเลือกตามเงื่อนไข ผลจริงจากโฟลเดอร์ทดสอบใหม่จบด้วย ExitCode 0 และแสดง affection 0 → 10 พร้อม choiceId, วัน, phase, ผลเงื่อนไข และ transition ใน [Trace](trace-probe/trace.jsonl) โครงนี้เป็นตัวอย่างสำหรับ 0a.1

ต้องใช้ Windows Desktop Session ที่เปิดหน้าต่างได้ แม้เปิดแบบ Hidden การทดสอบของ Gemini พบว่า SDL_VIDEODRIVER=dummy ให้ Invalid window จึงไม่ใช้กับคำสั่งนี้ ตั้งค่าข้ามเมนูและ splash ไว้ก่อนเริ่มเกม การรันบน CI เป้าหมายยังรอยืนยันและทดสอบ
ตรวจรับผ่านเมื่อ 2026-11-10 ตามที่เจ้าของโครงการยืนยันให้ใช้ผลจาก Windows เครื่องนี้เฉพาะ 0a.0
