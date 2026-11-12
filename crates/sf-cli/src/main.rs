use serde_json::Value;
use sf_core::{export::export_renpy, project::Project, validate::validate};
use std::{env, fs, path::Path, process::{Command, ExitCode}, thread, time::{Duration, Instant}};
mod parity;

fn write_new_game(project: &Project, dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let files = export_renpy(project)?;
    fs::create_dir(dir)?;
    for (relative, source) in files {
        let path = dir.join("game").join(relative);
        fs::create_dir_all(path.parent().expect("game path"))?;
        fs::write(path, source)?;
    }
    let game = dir.join("game");
    fs::create_dir_all(game.join("assets/fonts"))?;
    fs::write(game.join("sf_template.rpy"), include_str!("../../../templates/renpy/game/sf_template.rpy"))?;
    fs::write(game.join("assets/fonts/NotoSansThaiLoopedUI-Regular.ttf"), include_bytes!("../../../templates/renpy/game/assets/fonts/NotoSansThaiLoopedUI-Regular.ttf"))?;
    fs::write(game.join("assets/fonts/OFL.txt"), include_str!("../../../templates/renpy/game/assets/fonts/OFL.txt"))?;
    fs::create_dir_all(game.join("python-packages"))?;
    fs::write(game.join("python-packages/sf_tcc.py"), include_str!("../../../templates/renpy/game/python-packages/sf_tcc.py"))?;
    fs::write(game.join("python-packages/PyThaiNLP-LICENSE.txt"), include_str!("../../../templates/renpy/game/python-packages/PyThaiNLP-LICENSE.txt"))?;
    Ok(())
}

fn sdk_run(sdk: &Path, project: &Path, lint: bool) -> Result<(), Box<dyn std::error::Error>> {
    let project = std::path::absolute(project)?;
    let sdk = std::path::absolute(sdk)?;
    let mut command = Command::new(sdk.join("renpy.exe"));
    command.arg(project)
        .env("SDL_AUDIODRIVER", "dummy")
        .env_remove("SDL_VIDEODRIVER")
        .env("RENPY_DISABLE_JOYSTICK", "1")
        .env("RENPY_SKIP_MAIN_MENU", "1")
        .env("RENPY_SKIP_SPLASHSCREEN", "1")
        .env("RENPY_PERFORMANCE_TEST", "0");
    if lint { command.arg("lint"); }
    let mut child = command.spawn()?;
    let deadline = Instant::now() + Duration::from_secs(60);
    loop {
        if let Some(status) = child.try_wait()? {
            return if status.success() { Ok(()) } else { Err(format!("Ren'Py failed: {status}").into()) };
        }
        if Instant::now() >= deadline {
            child.kill()?;
            child.wait()?;
            return Err("Ren'Py timed out".into());
        }
        thread::sleep(Duration::from_millis(100));
    }
}

fn smoke(project: &Project, cases: &Path, case_id: &str, sdk: &Path, dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let cases: Value = serde_json::from_str(&fs::read_to_string(cases)?)?;
    let case = cases["cases"].as_array().ok_or("Invalid cases")?.iter()
        .find(|case| case["id"] == case_id).ok_or("Unknown case")?;
    // This smoke test exercises an unpatched game from its normal entry.
    let p = project.value();
    let graph = p["graphs"].as_array().unwrap().iter().find(|g| g["id"] == p["entryGraphId"]).unwrap();
    if case["startNodeId"] != graph["entryNodeId"]
        || !case["projectPatch"].as_array().is_some_and(Vec::is_empty)
        || !case["initialVarsOverride"].as_object().is_some_and(serde_json::Map::is_empty)
    {
        return Err("Smoke requires an unpatched case from the normal entry".into());
    }
    let labels = p["activities"].as_array().unwrap().iter().map(|a| (&a["id"], &a["name"]))
        .chain(p["nodes"].as_array().unwrap().iter()
            .flat_map(|n| n["choices"].as_array().into_iter().flatten())
            .map(|c| (&c["id"], &c["text"])));
    let labels: std::collections::HashMap<_, _> = labels.map(|(id, name)| (id.as_str().unwrap(), name)).collect();
    let inputs: Vec<_> = case["inputs"].as_array().ok_or("Invalid inputs")?.iter()
        .map(|id| labels.get(id.as_str().unwrap_or_default()).copied().ok_or("Unknown input ID"))
        .collect::<Result<_, _>>()?;
    let ending = case["assertions"].as_array().ok_or("Invalid assertions")?.iter()
        .find_map(|row| row["ending"].as_str()).ok_or("Smoke case requires an expected ending")?;
    write_new_game(project, dir)?;
    fs::write(dir.join("game/script.rpy"), format!(
        "label start:\n    $ sf_test_inputs = {}\n    $ menu = sf_test_menu\n    $ narrator = Character(None, interact=False)\n    call sf_entry\n    $ sf_test_finish({})\n    return\n",
        serde_json::to_string(&inputs)?, serde_json::to_string(ending)?
    ))?;
    fs::write(dir.join("game/sf_smoke.rpy"), include_str!("smoke.rpy"))?;
    sdk_run(sdk, dir, false)?;
    let result: Value = serde_json::from_str(&fs::read_to_string(dir.join("smoke-result.json"))?)?;
    if result["ending"] != ending { return Err("Unexpected smoke ending".into()); }
    println!("{}", serde_json::to_string(&result)?);
    Ok(())
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<_> = env::args().skip(1).collect();
    let load = |path: &str| -> Result<Project, Box<dyn std::error::Error>> {
        Ok(Project::from_json(&fs::read_to_string(path)?)?)
    };
    match args.as_slice() {
        [cmd, input, output] if cmd == "bundle" => {
            let project = load(input)?;
            let files = export_renpy(&project)?;
            let map = sf_core::export::source_map(&project, &files);
            let nodes = project.value()["nodes"].as_array().unwrap();
            let graphs = project.value()["graphs"].as_array().unwrap();
            let subgraphs: Vec<_> = graphs.iter().filter(|g| g["kind"] == "subgraph").collect();
            let ids: std::collections::HashSet<_> = subgraphs.iter().map(|g| &g["id"]).collect();
            let subnodes: Vec<_> = nodes.iter().filter(|n| ids.contains(&n["graphId"])).collect();
            let node_ids: std::collections::HashSet<_> = subnodes.iter().map(|n| &n["id"]).collect();
            let edges: Vec<_> = project.value()["edges"].as_array().unwrap().iter()
                .filter(|e| node_ids.contains(&e["from"])).collect();
            // Save compatibility depends on graph structure, not dialogue or display names.
            let mut graph_structure: Vec<_> = subgraphs.iter().map(|g| serde_json::json!({
                "id":g["id"],"entryNodeId":g["entryNodeId"]})).collect();
            let mut node_structure: Vec<_> = subnodes.iter().map(|n| serde_json::json!({
                "id":n["id"],"graphId":n["graphId"],"kind":n["kind"],
                "choices":n["choices"].as_array().map(|c| c.iter().map(|v| v["id"].clone()).collect::<Vec<_>>())})).collect();
            let mut edge_structure: Vec<_> = edges.iter().map(|e| serde_json::json!({
                "from":e["from"],"to":e["to"],"port":e["port"]})).collect();
            for rows in [&mut graph_structure,&mut node_structure,&mut edge_structure] {
                rows.sort_by_key(|v| v.to_string());
            }
            let structure = serde_json::json!({"graphs":graph_structure,"nodes":node_structure,"edges":edge_structure});
            let generated: serde_json::Map<String, Value> = files.into_iter()
                .filter(|(path, _)| path.starts_with("storyflow_generated/"))
                .map(|(path, source)| (format!("game/{path}"), Value::String(source))).collect();
            let bundle = serde_json::json!({"projectId":project.value()["id"],"files":generated,
                "sourceMap":map,"subgraphStructure":structure});
            fs::write(output, serde_json::to_string_pretty(&bundle)?)?;
        }
        [cmd, messages] if cmd == "protocol" => {
            let messages: Vec<Value> = serde_json::from_str(&fs::read_to_string(messages)?)?;
            let mut session = sf_core::protocol::Session::default();
            let results: Vec<_> = messages.into_iter().map(|message| session.dispatch(message)).collect();
            println!("{}", serde_json::to_string(&results)?);
        }
        [cmd, input] if cmd == "validate" => {
            let project = load(input)?;
            let issues = validate(&project);
            println!("{}", serde_json::to_string_pretty(&issues)?);
            if issues.iter().any(|issue| issue.severity == "error") { return Err("Validation failed".into()); }
        }
        [cmd, input, dir] if cmd == "export" => write_new_game(&load(input)?, Path::new(dir))?,
        [cmd, sdk, dir] if cmd == "lint" => sdk_run(Path::new(sdk), Path::new(dir), true)?,
        [cmd, input, cases, case_id, sdk, dir] if cmd == "smoke" =>
            smoke(&load(input)?, Path::new(cases), case_id, Path::new(sdk), Path::new(dir))?,
        [cmd, input, cases, sdk, dir] if cmd == "parity" =>
            parity::run(&load(input)?, Path::new(cases), Path::new(sdk), Path::new(dir))?,
        _ => return Err("Usage: sf-cli validate PROJECT | export PROJECT NEW_DIR | lint SDK_DIR GAME_DIR | smoke PROJECT CASES CASE_ID SDK_DIR NEW_DIR | parity PROJECT CASES SDK_DIR NEW_DIR".into()),
    }
    Ok(())
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => { eprintln!("{error}"); ExitCode::FAILURE }
    }
}
