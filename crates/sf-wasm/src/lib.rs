use sf_core::protocol::Session;
use std::cell::RefCell;

thread_local! {
    static SESSION: RefCell<Session> = RefCell::new(Session::default());
    static OUTPUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

// A small JSON ABI keeps browser binding code independent of wasm-bindgen.
#[no_mangle]
pub extern "C" fn sf_alloc(length: usize) -> *mut u8 {
    Box::into_raw(vec![0u8; length].into_boxed_slice()) as *mut u8
}

#[no_mangle]
pub unsafe extern "C" fn sf_dispatch(pointer: *mut u8, length: usize) -> u64 {
    let input = Box::from_raw(std::ptr::slice_from_raw_parts_mut(pointer, length));
    let message = serde_json::from_slice(&input).unwrap_or(serde_json::Value::Null);
    let response = SESSION.with(|session| session.borrow_mut().dispatch(message));
    OUTPUT.with(|output| {
        let mut buffer = output.borrow_mut();
        *buffer = serde_json::to_vec(&response).expect("serializable result");
        ((buffer.len() as u64) << 32) | buffer.as_ptr() as u64
    })
}

#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "storyflow")]
extern "C" {
    fn random_fill(pointer: *mut u8, length: usize);
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
unsafe extern "Rust" fn __getrandom_v03_custom(pointer: *mut u8, length: usize) -> Result<(), getrandom::Error> {
    random_fill(pointer, length);
    Ok(())
}
