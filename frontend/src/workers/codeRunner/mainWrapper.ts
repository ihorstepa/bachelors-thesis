// Current setup doesnt handle uncaught exceptions perfectly,
// so we need to create a wrapper for the code, that'll emulate the typical behavior
const mainWrapper = `#include <cxxabi.h>
#include <cstdlib>
#include <exception>
#include <cstdio>
#include <iostream>
#include <typeinfo>
#include <sysexits.h>

extern "C" int __wasm_user_main_with_args(int, char**) __attribute__((weak)) __asm__("_Z16__wasm_user_mainiPPc");
extern "C" int __wasm_user_main_no_args() __attribute__((weak)) __asm__("_Z16__wasm_user_mainv");

static void print_exception_header(const std::type_info* ti) {
    const char* raw = (ti != nullptr && ti->name() != nullptr) ? ti->name() : "<unknown>";
    int status = 0;
    char* demangled = abi::__cxa_demangle(raw, nullptr, nullptr, &status);
    const char* shown = (status == 0 && demangled != nullptr) ? demangled : raw;
    std::fprintf(stderr, "terminate called after throwing an instance of '%s'\\n", shown);
    std::free(demangled);
}

int main(int argc, char** argv) {
    try {
        if (__wasm_user_main_with_args != nullptr) {
            return __wasm_user_main_with_args(argc, argv);
        }
        if (__wasm_user_main_no_args != nullptr) {
            return __wasm_user_main_no_args();
        }
        std::fprintf(stderr, "runtime wrapper error: could not resolve renamed user main\\n");
        std::fprintf(stderr, "Aborted\\n");
        return EX_SOFTWARE;
    } catch (const std::exception& e) {
        print_exception_header(abi::__cxa_current_exception_type());
        std::fprintf(stderr, "  what():  %s\\n", e.what());
        std::fprintf(stderr, "Aborted\\n");
        return EX_SOFTWARE;
    } catch (...) {
        print_exception_header(abi::__cxa_current_exception_type());
        std::fprintf(stderr, "Aborted\\n");
        return EX_SOFTWARE;
    }
}
`
export default mainWrapper
