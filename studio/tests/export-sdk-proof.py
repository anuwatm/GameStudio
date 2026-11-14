"""Run real UI-exported game files in pinned SDK; only add a test-only driver outside generated/."""
import json,pathlib,subprocess,os,hashlib,sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'document/phase-1/evidence/1.6';browser=json.loads((OUT/'export-browser.json').read_text(encoding='utf-8'));SDK=ROOT/'temp/trace-spike/renpy-8.3.7-sdk/renpy.exe'
assert browser['passed'];report={'passed':False,'sdk':'8.3.7.25031702','mode':'Windows desktop; SDL_VIDEODRIVER removed; test-only entry wrapper after actual start, generated files unchanged','games':[]}
try:
 for mode in ['existing','new']:
  target=pathlib.Path(browser[mode+'Game']);project=json.loads((target/'project.storyflow.json').read_text(encoding='utf-8'));generated=target/'game/storyflow_generated'
  hashes=lambda:{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in generated.glob('*.rpy')}
  before=hashes();env={**os.environ,'SDL_AUDIODRIVER':'dummy','RENPY_DISABLE_JOYSTICK':'1','RENPY_SKIP_MAIN_MENU':'1','RENPY_SKIP_SPLASHSCREEN':'1','RENPY_PERFORMANCE_TEST':'0'};env.pop('SDL_VIDEODRIVER',None)
  lint=subprocess.run([str(SDK),str(target),'lint'],env=env,capture_output=True,timeout=60);(OUT/(mode+'-lint.txt')).write_bytes(lint.stdout+lint.stderr);assert lint.returncode==0,(mode,'lint',lint.returncode)
  # Preserve actual entry; intercept it only in a test driver. No generation/instrumentation replaces the UI-exported scripts.
  driver=target/'game/sf_ui_export_proof.rpy';driver.write_text("""init 100 python:
    import json, os
    config.label_overrides['sf_entry'] = 'sf_ui_export_entry'
    sf_ui_positions = [0, 0, 1, 0]
    def sf_ui_menu(items):
        available = [value for label, value in items if value is not None]
        selected = available[sf_ui_positions.pop(0)]
        return selected.value if hasattr(selected, 'value') else selected
    def sf_ui_done():
        data = {'ending': sf_ending, 'day': sf_day}
        data['vars'] = {k: getattr(renpy.store, k) for k in dir(renpy.store) if k.startswith('sf_variable_')}
        with open(os.path.join(config.basedir, 'ui-sdk-result.json'), 'w', encoding='utf-8') as out:
            json.dump(data, out, ensure_ascii=False)
        renpy.quit()
label sf_ui_export_entry:
    $ config.label_overrides.pop('sf_entry', None)
    $ menu = sf_ui_menu
    $ narrator = Character(None, interact=False)
    call sf_entry
    $ sf_ui_done()
    return
""",encoding='utf-8')
  run=subprocess.run([str(SDK),str(target)],env=env,capture_output=True,timeout=60);(OUT/(mode+'-run.txt')).write_bytes(run.stdout+run.stderr);assert run.returncode==0,(mode,'run',run.returncode)
  result=json.loads((target/'ui-sdk-result.json').read_text(encoding='utf-8'));assert before==hashes()
  if mode=='new':assert result['ending']==project['nodes'][-1]['id'] and result['vars']['sf_variable_'+project['variables'][0]['id'].replace('-','')[-12:]]==7
  else:assert result['ending']=='00000000-0000-4000-8000-000000000009' and result['day']==3
  report['games'].append({'mode':mode,'path':str(target),'lintExit':lint.returncode,'runExit':run.returncode,'result':result,'generatedHashesBefore':before,'generatedUnchanged':True});print(mode,result,flush=True)
 report['passed']=True
finally:(OUT/'sdk-export.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
