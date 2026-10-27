# Tests run through the trace map spec and the CLI

There are two test seams. Core is tested only through its public "trace map spec in, SVG out" function, against a shared set of golden SVG fixtures; this is what guarantees the web app and the CLI produce the same images, since both call that function. The CLI is tested end to end by running the real command on trace files and comparing its output with the same fixtures. Layout internals and React components are not tested directly.
