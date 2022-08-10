ifeq ($(CLANG),)
CLANG := clang
endif

maze-c.wasm: maze.c
	${CLANG} --target=wasm32 --no-standard-libraries -O3 -Wl,--export-all -Wl,--no-entry -Wl,--import-undefined -Wl,--initial-memory=524288 -z stack-size=262144 -pedantic -Wall -Wextra -Werror -o maze-c.wasm maze.c

clean:
	@rm maze-c.wasm
