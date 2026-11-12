from pathlib import Path
import re, sys
skill = Path(sys.argv[1])
out = Path('document/diagrams')
t = (skill/'assets/template.html').read_text(encoding='utf-8')
t = t.replace('<!-- TITLE -->','StoryFlow · Technology Stack').replace('<!-- KICKER: e.g. stack-diagram / author / 2026-08 -->','StoryFlow / 2026-11-12')
t = t.replace('<!-- LEDE: 1-2 short sentences, or delete this <p> -->','Local-first narrative authoring. Existing Core and storage prototypes; React Studio is planned for Phase 1.')
t = t.replace('width: 1000px; height: 540px','width: 1150px; height: 920px').replace('width:1000px; height:540px','width:1150px; height:920px')
t = t.replace('</style>', '.page{max-width:1250px}.canvas-title{position:absolute;left:55px;top:28px;font:600 22px var(--font-display)}.canvas-note{position:absolute;left:55px;top:59px;font:11px var(--font-mono);color:var(--color-muted)}.canvas-legend{position:absolute;left:55px;top:882px;font:11px var(--font-mono);color:var(--color-neutral)}.file-note{position:absolute;left:80px;top:786px;font:10px var(--font-mono);color:var(--color-neutral)}.tile{color-scheme:light}.tile img{max-height:40px}.role span{white-space:nowrap}</style>')
groups=[('gb',55,100,535,400,'chrome','Chromium desktop / no backend'),('ga',685,100,410,200,'rust','Rust Core / pure logic, no I/O'),('gb',685,330,410,210,'cli','Native CLI & verification'),('gb',55,590,740,220,'folder','Local Ren’Py project folder'),('ga',915,590,180,220,'renpy','Game runtime')]
parts=['<div class="canvas-title">StoryFlow / Technology Stack</div>','<div class="canvas-note">2026-11-12 · Rust/WASM confirmed at Gate 0b.5; UI integration is planned for Phase 1</div>']
for cls,x,y,w,h,icon,title in groups:
 parts.append(f'<div class="group {cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"><div class="g-label"><img class="plate" src="%%ICON_{icon}%%" alt="">{title}</div></div>')
edges=[('e','M179 190 H291','UI',235,182),('e','M359 190 H466','commands',413,182),('e','M534 190 H741','JSON ABI',638,182),('n dash','M971 190 H809','compile',890,182),('e','M145 266 V344','folder I/O',191,307),('n','M500 266 V344','v1 schema',546,307),('e','M325 266 V344','drafts',355,307),('n','M1005 266 V305 H665 V420 H741','shared core',865,297),('n dash','M971 420 H809','test driver',890,412),('e','M145 456 V550 H425 V644','export',300,541),('n','M145 456 V565 H705 V644','read assets',586,557),('n dash','M775 496 V565 H1005 V644','SDK parity',896,556),('e','M739 680 H971','media',852,672),('e','M425 756 V842 H1005 V756','generated scripts',715,834)]
parts.append('<svg class="edges" viewBox="0 0 1150 920" aria-hidden="true"><defs><marker id="ar" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="context-stroke"/></marker></defs>')
for cls,d,label,x,y in edges:
 parts.append(f'<path class="{cls}" d="{d}" marker-end="url(#ar)"/><text class="el" x="{x}" y="{y}" text-anchor="middle">{label}</text>')
parts.append('</svg>')
nodes=[(145,160,'react','React','UI / planned'),(325,160,'flow','Graph Editor','React Flow / planned'),(500,160,'cli','Web Worker','passed 0a.7'),(145,350,'folder','File System Access','passed 0b.1–0b.2'),(325,350,'database','IndexedDB','recovery / planned'),(500,350,'contract','Core Contract','schema v1 / passed'),(775,160,'webassembly','WebAssembly','sf-wasm / passed'),(1005,160,'rust','Rust','sf-core / passed'),(775,390,'cli','sf-cli','native export / parity'),(1005,390,'nodejs','Node.js','test tooling only'),(145,650,'contract','Project JSON','source of truth'),(425,650,'files','Generated Files','.rpy + manifest'),(705,650,'folder','Existing Assets','zero-copy media'),(1005,650,'renpy','Ren’Py SDK','8.3.7.25031702')]
for cx,y,icon,name,role in nodes:
 parts.append(f'<div class="node" style="left:{cx-66}px;top:{y}px"><div class="tile"><img src="%%ICON_{icon}%%" alt="{name}"></div><div class="name"><span>{name}</span></div><div class="role"><span>{role}</span></div></div>')
parts.append('<div class="file-note">.storyflow/ → source map · pending journal · backups (outside game/)</div>')
parts.append('<div class="canvas-legend">Solid: runtime / data flow · Dashed: build / test tooling · “planned”: Phase 1 integration pending</div>')
a=t.index('    <!-- GROUPS '); b=t.index('\n  </div>\n  </div>',a)
t=t[:a]+'\n'.join(parts)+t[b:]
t=t.replace('<!-- FOOT-LEFT: author / one-liner -->','StoryFlow · MVP target / 0a–0b baseline').replace('<!-- FOOT-RIGHT: icon sources actually used, from manifest.json, e.g. "icons: svgl / devicon / Lucide" -->','icons: svgl / gilbarbara/logos / devicon / Lucide · brands belong to their owners')
t=t.replace('request path','runtime / data').replace('dev / deploy','build / tests')
(out/'storyflow-stack.source.html').write_text(t,encoding='utf-8')
