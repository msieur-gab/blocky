# nlu-eval — measuring what blocky understands

Runs the app's real NLU (`intent.resolve`: names → rules → MiniLM) in node on written
sentences, and reports where it goes wrong. No browser, nothing to install.

    ./run.sh                  the full report (eval.mjs)
    ./run.sh themes           the small-talk themes (water, food) and their neighbours
    ./run.sh names            "i'm emma" against "i'm stuck"
    ./run.sh more-phrasings   does adding phrasings help sentences it has not seen?

- `corpus.mjs` — 274 sentences that should land on an intent, 84 that should land on nothing.
  None is an exemplar. Written by Claude, typed: not children, not a recognizer's output.
- `eval.mjs` sections: A exemplars another tier takes first · B exemplars of different intents
  that sit close together · C the corpus through the whole pipeline · D out-of-scope sentences
  that fire · E the threshold, swept.

Figures on 2026-10-07: 215 / 274 in scope, 45 / 84 out-of-scope sentences fire.
When a theme or a rule changes, run it before and after.
