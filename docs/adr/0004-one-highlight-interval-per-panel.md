# One highlight interval per panel, everything else neutral grey

The prototype distinguished a current step from fading past steps. That is dropped: a panel has exactly one highlight, a contiguous interval of steps drawn in one color, with markers at both ends (a single marker for a one-step interval). Step numbers appear only inside the highlight and restart at 1 at its first step. Everything outside the highlight, whether unhighlighted steps of the trace or parts of the tree the trace never visits, is drawn the same medium-width neutral grey with readable labels. No highlight means the whole trace is highlighted.

## Consequences

- To show paths that matter but are not part of the flow, append them to the trace file (after a comment line) outside the highlight. There is no separate "mark" option; they are ordinary steps and the grey trace line reaches them.
- A long flow explained in parts becomes several images of the same trace with different highlights, not one image with several highlights.
