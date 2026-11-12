# Phase 0b.2 · Transactional Export

วันที่ 2026-11-11 · พัฒนาเสร็จ / Codex ตรวจรับผ่าน · รอ Gemini ตรวจรับอิสระตามข้อตกลง agent ไม่ใช่การปิด Gate 0b

## ผลตาม checklist

| ขั้น | ผลและหลักฐาน |
|---|---|
| 0b.2.1 | ตรวจ manifest version/project ID, owned paths และ SHA-256 ก่อนเขียน; หยุดเมื่อไฟล์เดิมถูกแก้หรือชื่อชน; ทดสอบว่าชุดไฟล์ไม่เปลี่ยนเมื่อ conflict |
| 0b.2.2 | เตรียม next.json และ export.json ใน .storyflow/backups/<UUID>/ ก่อน pending; journal เก็บ backupHash, hashes ชุดใหม่ และ hashes metadata; ตรวจ backupHash ก่อนกู้คืน |
| 0b.2.3 | เขียนผ่าน FileSystemWritableFileStream แล้ว close ทีละไฟล์; Source Map ก่อน manifest; commit manifest ท้ายสุด แล้วล้าง pending; export/recover ใช้ Web Lock เดียวกันทั้ง origin |
| 0b.2.4 | เปิด LocalProject ใหม่แล้ว recover คืนชุดเดิมก่อน commit หรือคงชุดใหม่เมื่อ manifest commit แล้ว; ตรวจ Source Map ตาม path/เลขบรรทัดกับ ID ที่รู้คำตอบ รวม choice ข้อความซ้ำ |
| 0b.2.5 | fingerprint เฉพาะ graph entry/node kind/choice IDs/edges ใน Subgraph; แก้บทพูดไม่เตือน เปลี่ยนเส้นทางเตือนครั้งแรก; วัด edit → CLI bundle → commit 950.8164 ms |

## โค้ดและหน้าที่

- [Adapter](../../web/local-folder.mjs): file I/O, conflict checking, backup/journal/hash, transaction และ recovery
- [CLI](../../crates/sf-cli/src/main.rs): bundle จาก Project และ fingerprint input ที่คงเฉพาะโครงสร้าง ไม่รวมชื่อหรือบทพูด
- [Exporter](../../crates/sf-core/src/export.rs): สร้าง Source Map; ใช้ลำดับ choice แทนจับคู่ด้วยข้อความเพื่อรองรับข้อความซ้ำ
- [Browser tests](../../web/local-folder-test.mjs) และ [filesystem regression](../../scripts/test-transaction.mjs)

เมื่อเปิดโปรเจกต์ integration ต้อง await adapter.recover() ก่อนให้แก้/ส่งออก; adapter.export() เรียก recovery ภายใต้ lock ก่อนเริ่มเองด้วย ถ้ามี conflict ให้หยุดและแสดงเหตุผล ห้าม force overwrite โดยเงียบ

## ลำดับและผลกู้คืน

1. ตรวจ ownership/hash และชื่อชนทั้งหมดก่อนเริ่มเขียน backup
2. สร้างเนื้อหาใหม่และ hash แล้วเก็บ next.json / export.json นอก game
3. เขียน export.pending.json
4. ตรวจไฟล์อีกครั้งก่อนแทนทีละรายการ รวมการลบไฟล์เก่าที่ manifest เป็นเจ้าของ
5. ตรวจ Source Map / manifest ว่าไม่ถูกแก้ระหว่างส่งออก แล้วเขียน Source Map และ commit manifest เป็นลำดับสุดท้าย
6. ลบ pending หลัง commit สำเร็จ

หากหยุดก่อน commit ให้ preflight ไฟล์ทั้งชุดและ Source Map ก่อน rollback; ไฟล์ใหม่ที่ไม่เคยมีถูกลบ ไฟล์ที่เคยมีถูกคืน และไฟล์ผู้ใช้คงเดิม หาก manifest ชุดใหม่ตรงและไฟล์/Source Map ครบ ให้ถือว่า commit สำเร็จแล้วและล้าง pending หาก backup เสียหรือมี external edit ให้เก็บ pending และหยุดเพื่อไม่ทำลายข้อมูล

Web Locks ใช้ชื่อ storyflow-export แบบ origin-wide เพื่อล็อกแม้โฟลเดอร์ว่างถูกเปิดด้วยคนละ Project ID ข้อแลกเปลี่ยนคือส่งออกหลายโปรเจกต์ใน origin เดียวกันเรียงคิว เหมาะกับ prototype ปัจจุบัน

## หลักฐาน

- [Regression บนไฟล์จริง](evidence/transaction-report.json): **18/18** checks ผ่าน ใช้ Node v24.22.1 บน Windows กับ filesystem handle adapter
- [Edge OPFS](evidence/transaction-browser-report.json): **10/10** checks ผ่านด้วย adapter รุ่นล่าสุด รวม fault หลัง pending/file/sourceMap/manifest, recovery และ conflict
- [Environment / source hashes](evidence/transaction-environment.json): รุ่น Edge, hash source และผล Rust workspace **12 เทสต์ผ่าน**, sf-cli build สำเร็จ
- [Native Folder baseline 0b.1](evidence/native-report.json): browser native-folder ผ่านก่อนการแก้รอบนี้ เก็บเป็นหลักฐานเดิม ไม่อ้างว่าเป็นการทดสอบ adapter รุ่นล่าสุด

Source Map ที่รู้คำตอบ: game/storyflow_generated/sf_story.rpy บรรทัด 18 → node ...000006 / choice ...000015 และบรรทัด 20 → node ...000006 / choice ...000016 แม้ข้อความทั้งสองตัวเลือกเหมือนกัน ตรวจฉาก label ของ Date Invite และช่วงเลขบรรทัดบน Edge ด้วย

เวลา 950.8164 ms เริ่มหลัง export ฐานครั้งแรกเสร็จ: แก้ข้อความในหน่วยความจำ → เขียน Project JSON → เปิด native CLI process เพื่อ bundle → export บน filesystem adapter จน commit รวม process/I/O ไม่รวมการพิมพ์ของผู้ใช้หรือ render React เป็น sample เดียว ไม่ใช่ median และไม่ใช่ SLA ส่งต่อใช้ประกอบ 0b.5

## รันซ้ำ

ตั้ง Rust/Cargo/Windows linker ตาม [สภาพแวดล้อม 0a](../phase-0a/worker-0a7.md) แล้วรันจากราก repository:

```powershell
cargo test --workspace --locked --offline
cargo build -p sf-cli --locked --offline
node scripts/test-transaction.mjs temp/rust-target/debug/sf-cli.exe temp/0b-prototype/probe.webm
```

ระบุพาธ CLI ให้ตรง CARGO_TARGET_DIR ของเครื่อง หากไม่มี dependency cache ให้ติดตั้งก่อนใช้ --offline สคริปต์สร้าง directory ใหม่ใต้ temp/phase-0b2-<timestamp>/ และเขียน transaction-report.json ใหม่ การรันไม่ลบหรือเขียนทับโฟลเดอร์ผู้ใช้

ไฟล์ probe.webm ใช้ test pattern 2 วินาทีพร้อม sine 440 Hz จากรอบ 0b.1; สร้างใหม่ได้ด้วย ffmpeg:

```powershell
ffmpeg -f lavfi -i testsrc2=size=640x360:rate=24 -f lavfi -i sine=frequency=440:sample_rate=48000 -t 2 -c:v libvpx-vp9 -b:v 300k -c:a libopus temp/probe-0b2.webm
```

จากนั้นส่งพาธคลิปเป็น argument ที่สองให้สคริปต์ สคริปต์ไม่ใช้ hash ของคลิปตายตัว

Browser: เตรียม directory ใหม่ คัดลอก web/local-folder.mjs, local-folder-test.mjs, local-folder.html, probe.webm และสร้าง bundle.json ด้วย `sf-cli bundle PROJECT OUTPUT` รัน `node web/serve-proof.mjs DIRECTORY 8766` แล้วเปิด localhost/local-folder.html?opfs บนพอร์ตดังกล่าว ผล POST ลง opfs-report.json; ต้องตรวจ mode และไม่มี error ก่อนคัดลอกหลักฐาน ห้ามใช้ OPFS report อ้างเป็น native-folder

## ข้อจำกัดและงานต่อ

- Node driver ใช้ไฟล์จริงแต่จำลอง interface directory handles และ Web Locks ไม่ใช่ทดสอบ browser native picker/OS permission; Edge OPFS เป็นผล browser API จริงแยกต่างหาก
- ยังไม่ทดสอบปิดแท็บจริงหรือเพิกถอนสิทธิ์จริงในรอบนี้: เป็น 0b.4 การ throw NotAllowedError เป็น fault injection เท่านั้น
- การเขียนทีละไฟล์ไม่มี atomicity ข้ามทั้งชุด; journal เป็นกลไก recovery ไม่รับประกันว่า SDK ที่เปิดระหว่างส่งออกจะไม่เห็นชุดผสม
- Web Lock ป้องกันเฉพาะ client ที่ร่วม lock ใน origin เดียว ไม่ล็อก external editor; ตรวจ hash ก่อนเขียนช่วยจับความขัดแย้ง แต่ยังมีช่องเวลาระหว่างตรวจและเขียนที่ API ไม่มี compare-and-swap
- Backup ยังเก็บไว้ ไม่ทำ retention cleanup อัตโนมัติ หากเจอ pending จาก prototype รุ่นเก่าที่ไม่มี backupHash/projectId จะหยุดแบบ fail-closed ไม่เดา metadata เพื่อกู้คืน
- Save warning บอกความเสี่ยง ไม่รับประกันการโหลด Save เก่า และไม่รวมการตรวจเข้ากันได้ทุกชนิดการแก้ตรรกะ
- BUG-0b-001 เรื่อง % เป็นงาน 0b.3; ผลรอบนี้ไม่ปิดเรื่อง escaping
