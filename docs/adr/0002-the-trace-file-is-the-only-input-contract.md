# The trace file is the only input contract

A trace file is plain text, one step per line (`path  # note`), in execution order. How a trace is produced is deliberately out of scope: it may be hand-written, written by an agent reading the code, or generated from tests or a tracer such as `sys.settrace`. Keeping the format small and stable lets collectors be added later without touching rendering.
